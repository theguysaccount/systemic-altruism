export const causeLabels = {
  A:'Arts & culture', B:'Education', C:'Environment', D:'Animals', E:'Health care',
  F:'Mental health', G:'Disease research & support', H:'Medical research',
  I:'Justice & legal services', J:'Employment', K:'Food & agriculture',
  L:'Housing', M:'Public safety & disaster relief', N:'Sports & recreation',
  O:'Youth development', P:'Human services', Q:'International affairs & development',
  R:'Civil rights & social action', S:'Community development', T:'Philanthropy & grantmaking',
  U:'Science & technology', V:'Social science', W:'Public & societal benefit',
  X:'Religion', Y:'Mutual benefit', Z:'Other / unclassified', '?':'Classification unavailable'
};
export const stateLabels = {AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',PR:'Puerto Rico',XX:'Other / overseas IRS records'};
export const foundationLabels = {'02':'Private operating foundation','03':'Private operating foundation','04':'Private non-operating foundation','09':'Classification pending','10':'Church','11':'School','12':'Hospital / medical research organization','13':'College / university support','14':'Governmental unit','15':'Publicly supported charity','16':'Publicly supported charity','17':'Supporting organization','18':'Public safety testing','21':'Supporting organization (Type I)','22':'Supporting organization (Type II)','23':'Supporting organization (Type III, integrated)','24':'Supporting organization (Type III, non-integrated)','25':'Agricultural research organization'};
export const normalize = text => String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
