"""Import the current IRS 501(c)(3) snapshot and build a compressed read-only search database.

Only public organization identity/classification fields are retained. Never import
officer names, street addresses, finances, or invented impact assessments.
"""
import csv, gzip, hashlib, json, re, shutil, sqlite3, unicodedata
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / '.cache/irs'
OUT = ROOT / 'data/registry'
PAGE = 'https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf'

def normalize(text):
    return re.sub('[^a-z0-9]+', ' ', unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().lower()).strip()

def tokens(text):
    return normalize(text).split()

def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    html = urlopen(PAGE, timeout=60).read().decode()
    match = re.search(r'Updated data posting date:.*?<strong>([0-9/]+)</strong>', html, re.S)
    if not match:
        raise ValueError('Cannot verify the IRS snapshot posting date')
    posted = datetime.strptime(match[1], '%m/%d/%Y').date().isoformat()
    expected = int(re.search(r'Record count:.*?<strong>([0-9,]+)</strong>', html, re.S)[1].replace(',', ''))
    links = re.findall(r'href="([^"]+/eo[1-4]\.csv)"', html)
    if len(links) != 4:
        raise ValueError('Expected exactly four official regional extract links')
    sources = ['https://www.irs.gov'+s if s.startswith('/') else s for s in links]
    def download(url):
        target = CACHE / (posted+'-'+url.rsplit('/',1)[1])
        if not target.exists():
            temp = target.with_suffix('.partial')
            with urlopen(url, timeout=120) as response, temp.open('wb') as dest:
                shutil.copyfileobj(response, dest)
            temp.rename(target)
        digest = hashlib.sha256(target.read_bytes()).hexdigest()
        print(f'Downloaded {target.name}: {target.stat().st_size:,} bytes', flush=True)
        return {'url':url,'path':target,'sha256':digest,'bytes':target.stat().st_size}
    with ThreadPoolExecutor(max_workers=4) as pool:
        downloads = list(pool.map(download, sources))
    dbpath = CACHE/'import.sqlite'
    dbpath.unlink(missing_ok=True)
    db = sqlite3.connect(dbpath)
    db.execute('PRAGMA journal_mode=OFF')
    db.execute('CREATE TABLE records (ein TEXT PRIMARY KEY, name TEXT, alias TEXT, city TEXT, state TEXT, ntee TEXT, foundation TEXT, ruling TEXT, status TEXT)')
    raw_count = 0
    selected_count = 0
    for source in downloads:
        with source['path'].open(newline='',encoding='utf-8-sig') as f:
            rows = []
            for r in csv.DictReader(f):
                raw_count += 1
                if r['SUBSECTION'].zfill(2) != '03' or r['STATUS'].zfill(2) not in ('01','02'):
                    continue
                ein = r['EIN'].zfill(9)
                if not re.fullmatch(r'\d{9}',ein) or not r['NAME'].strip():
                    raise ValueError('Invalid identity in source snapshot')
                selected_count += 1
                state = r['STATE'].strip().upper()
                if not re.fullmatch('[A-Z]{2}',state): state = 'XX'
                rows.append((ein,r['NAME'].strip(),r['SORT_NAME'].strip(),r['CITY'].strip(),state,r['NTEE_CD'].strip().upper(),r['FOUNDATION'].zfill(2),r['RULING'],r['STATUS'].zfill(2)))
                if len(rows) >= 10000:
                    db.executemany('INSERT OR IGNORE INTO records VALUES (?,?,?,?,?,?,?,?,?)', rows)
                    rows = []
            db.executemany('INSERT OR IGNORE INTO records VALUES (?,?,?,?,?,?,?,?,?)', rows)
            db.commit()
    if raw_count != expected:
        raise ValueError(f'Source record count changed: expected {expected:,}, read {raw_count:,}; verify the source before release')
    count = db.execute('SELECT count(*) FROM records').fetchone()[0]
    if count < 1_000_000:
        raise ValueError('Unexpectedly small charitable subset; refusing incomplete publication')
    db.execute('CREATE INDEX names ON records(name,ein)')
    db.commit()
    state_counts = dict(db.execute('SELECT state,count(*) FROM records GROUP BY state'))
    cause_counts = dict(db.execute("SELECT CASE WHEN substr(ntee,1,1) BETWEEN 'A' AND 'Z' THEN substr(ntee,1,1) ELSE '?' END,count(*) FROM records GROUP BY 1"))
    cross_counts = dict(db.execute("SELECT state||':'||CASE WHEN substr(ntee,1,1) BETWEEN 'A' AND 'Z' THEN substr(ntee,1,1) ELSE '?' END,count(*) FROM records GROUP BY 1"))
    db.close()
    if dbpath.stat().st_size > 400_000_000:
        raise ValueError('Registry exceeds the bounded temporary-disk budget')
    temporary = ROOT/'data/registry-next'
    if temporary.exists(): shutil.rmtree(temporary)
    temporary.mkdir()
    artifact = temporary/'registry.sqlite.gz'
    with dbpath.open('rb') as inp, artifact.open('wb') as output:
        with gzip.GzipFile(filename='',mode='wb',fileobj=output,compresslevel=6,mtime=0) as zipped:
            shutil.copyfileobj(inp,zipped)
    size = artifact.stat().st_size
    if size > 180_000_000:
        raise ValueError('Compressed registry exceeds the reviewed package budget')
    artifact_hash=hashlib.sha256(artifact.read_bytes()).hexdigest()
    parts=[]
    with artifact.open('rb') as inp:
        while chunk:=inp.read(32_000_000):
            name=f'registry-{len(parts):02d}.gzpart'
            (temporary/name).write_bytes(chunk)
            parts.append({'name':name,'bytes':len(chunk),'sha256':hashlib.sha256(chunk).hexdigest()})
    artifact.unlink()
    manifest = {
        'schemaVersion':2,'source':'IRS Exempt Organizations Business Master File','sourceUrl':PAGE,
        'sourcePostedAt':posted,'importedAt':datetime.now(timezone.utc).isoformat(),
        'sourceRecordCount':raw_count,'recordCount':count,'duplicateSelectedRecords':selected_count-count,
        'selection':'SUBSECTION=03 and STATUS in 01 (unconditional exemption), 02 (conditional exemption); deduplicated by EIN',
        'coverage':'IRS-recognized 501(c)(3) organizations, including public charities, private foundations and religious/educational entities. This is not a worldwide registry or a systems-change assessment.',
        'fields':['ein','name','alternateName','city','state','ntee','foundationCode','rulingDate','statusCode'],
        'states':dict(sorted(state_counts.items())),'causes':dict(sorted(cause_counts.items())),
        'stateCauses':dict(sorted(cross_counts.items())),
        'compressedBytes':size,'databaseBytes':dbpath.stat().st_size,
        'databaseSha256':hashlib.sha256(dbpath.read_bytes()).hexdigest(),
        'artifactSha256':artifact_hash,'artifactParts':parts,
        'regionalSources':[{k:v for k,v in s.items() if k!='path'} for s in downloads]
    }
    (temporary/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    if OUT.exists(): shutil.rmtree(OUT)
    temporary.rename(OUT)
    staging = CACHE/'registry-staging'
    if staging.exists(): shutil.rmtree(staging)
    print(f'Published {count:,} real registry records ({size/1_000_000:.1f} MB compressed)',flush=True)

if __name__=='__main__': main()
