export async function onRequest(context) {
  const url = new URL(context.request.url);
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const heading = url.searchParams.get('heading') || '0';
  const pitch = url.searchParams.get('pitch') || '15';
  const fov = url.searchParams.get('fov') || '90';
  const color = url.searchParams.get('color') || 'Charcoal';
  const colorHex = url.searchParams.get('hex') || '#3c3c3e';
  const colorDesc = url.searchParams.get('desc') || 'Dark gray';

  const MAPS_KEY = 'AIzaSyCmWYFOj2tO_eEN0TgNZDavJoKqV2fsNrU';
  const GEMINI_KEY = 'AIzaSyCcODZGJKuokABxZir1ZGxzKm3HY9NGmIk';

  if (!lat || !lng) {
    return new Response(JSON.stringify({error: 'Missing lat/lng'}), {
      status: 400,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
    });
  }

  try {
    // 1. Fetch Street View image
    const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x500&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=${fov}&key=${MAPS_KEY}`;
    const svResponse = await fetch(svUrl);
    if (!svResponse.ok) throw new Error('Street View fetch failed: ' + svResponse.status);
    const svBuffer = await svResponse.arrayBuffer();
    const bytes = new Uint8Array(svBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const svBase64 = btoa(binary);

    // 2. Call Gemini API with image
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_KEY}`;
    const geminiBody = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: svBase64
            }
          },
          {
            text: `Change the roof color of this house to ${color} (${colorHex}) asphalt shingles "${colorDesc}". Keep everything else exactly the same — walls, windows, trees, sky, ground. Only modify the roof shingle color. Photorealistic result.`
          }
        ]
      }],
      generationConfig: {
        responseModalities: ['Text', 'Image']
      }
    };

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(geminiBody)
    });

    const geminiData = await geminiResponse.json();

    if (geminiData.error) {
      // Try fallback model
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_KEY}`;
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(geminiBody)
      });
      const fallbackData = await fallbackResponse.json();
      if (fallbackData.error) {
        throw new Error(fallbackData.error.message || 'Gemini API error');
      }
      return new Response(JSON.stringify(fallbackData), {
        headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
      });
    }

    return new Response(JSON.stringify(geminiData), {
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
    });

  } catch (err) {
    return new Response(JSON.stringify({error: err.message}), {
      status: 500,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
    });
  }
}
