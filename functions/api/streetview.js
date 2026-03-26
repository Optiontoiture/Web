export async function onRequest(context) {
  const url = new URL(context.request.url);
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const heading = url.searchParams.get('heading') || '0';
  const pitch = url.searchParams.get('pitch') || '15';
  const fov = url.searchParams.get('fov') || '90';
  const key = 'AIzaSyCmWYFOj2tO_eEN0TgNZDavJoKqV2fsNrU';

  if (!lat || !lng) {
    return new Response('Missing lat/lng', { status: 400 });
  }

  const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x500&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=${fov}&key=${key}`;

  const response = await fetch(svUrl);
  const imageBuffer = await response.arrayBuffer();

  return new Response(imageBuffer, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
