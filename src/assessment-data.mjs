// Returning visitors may have an older API response cached under the same URL.
// A new interface must not silently combine new weights with a stale cohort.
export async function loadAssessments(request = fetch) {
  const response = await request('/api/v1/charities.json', {cache:'no-store'});
  if (!response.ok) throw new Error('Assessment dataset unavailable');
  return response.json();
}
