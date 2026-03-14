const TOMODAT_TOKEN = process.env.TOMODAT_TOKEN;
const RADIO_METROS = 600;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const direccion = req.method === 'POST'
    ? req.body?.direccion
    : req.query?.direccion;

  if (!direccion) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Falta el parámetro "direccion"'
    });
  }

  try {
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(direccion)}&format=json&limit=1`;
    const geoRes = await fetch(geoUrl, {
      headers: { 'User-Agent': 'CoberturaBot/1.0' }
    });
    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      return res.status(200).json({
        ok: false,
        mensaje: '❌ No pudimos encontrar esa dirección. ¿Podés escribirla más completa? Por ejemplo: *Av. San Martín 1234, Morón*'
      });
    }

    const { lat, lon, display_name } = geoData[0];

    console.log('Token:', TOMODAT_TOKEN ? 'OK' : 'UNDEFINED');
console.log('URL:', `https://sys.tomodat.com.br/tomodat/api/clients/viability/${lat}/${lon}/${RADIO_METROS}`);

    const tomodatUrl = `https://sys.tomodat.com.br/tomodat/api/clients/viability/${lat}/${lon}/${RADIO_METROS}`;
    const tomodatRes = await fetch(tomodatUrl, {
      headers: {
        'Authorization': `Bearer ${TOMODAT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const cajasRaw = await tomodatRes.text();
console.log('Tomodat status:', tomodatRes.status);
console.log('Tomodat response:', cajasRaw);
const cajas = JSON.parse(cajasRaw);

    const cajasConPuertos = Array.isArray(cajas)
      ? cajas.filter(c => c.splitters?.some(s => s.free_ports_number > 0))
      : [];

    const hayCobertura = cajasConPuertos.length > 0;

return res.status(200).json({
  ok: true,
  hayCobertura,
  direccionEncontrada: display_name,
  coordenadas: { lat, lon },
  cajasDisponibles: cajasConPuertos.length,
  cajasRaw: cajas,
  token_presente: !!TOMODAT_TOKEN,
  url_consultada: tomodatUrl,
  mensaje: hayCobertura
    ? `✅ ¡Buenas noticias! Tenemos cobertura en *${display_name}*. Un asesor se va a contactar con vos a la brevedad para coordinar la instalación.`
    : `❌ Por el momento no tenemos cobertura en *${display_name}*. Te anotamos en lista de espera y te avisamos cuando lleguemos a tu zona.`
});

  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: '⚠️ Hubo un error al verificar la cobertura. Por favor intentá de nuevo.'
    });
  }
}
