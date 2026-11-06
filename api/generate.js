// File: api/generate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { topic, numSlides, platform, aspectRatio, password } = req.body;
  
  if (password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Password salah atau tidak valid!' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API Key belum diatur.' });

  try {
    // 1. Minta Gemini membuat struktur dan teksnya
    const textPrompt = `Kamu adalah content creator ${platform}. Buat carousel ${numSlides} slide topik '${topic}'. Output JSON persis: {"slides": [{"slideNumber": 1, "headline": "Judul (maks 5 kata)", "subtext": "Teks (maks 10 kata)", "visualPrompt": "deskripsi background detail bahasa inggris"}], "caption": "Caption", "hashtags": "#tag"}`;
    const textUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
    
    const textResponse = await fetch(textUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: textPrompt }] }], generationConfig: { responseMimeType: "application/json" } })
    });

    const textData = await textResponse.json();
    const jsonText = textData.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedData = JSON.parse(jsonText);

    // 2. Gunakan Image Server super cepat untuk gambarnya (tanpa membebani Vercel)
    const slidesWithImages = [];
    
    // Tentukan ukuran pixel berdasarkan rasio
    let width = 900; let height = 1600;
    if(aspectRatio === '1:1') { width = 1080; height = 1080; }
    else if(aspectRatio === '4:5') { width = 1080; height = 1350; }
    else if(aspectRatio === '16:9') { width = 1920; height = 1080; }

    for (let i = 0; i < parsedData.slides.length; i++) {
      const slide = parsedData.slides[i];
      // Format URL gambar menggunakan Pollinations AI (gratis & cepat)
      const imagePrompt = `Carousel background for ${platform}. ${slide.visualPrompt}. Write text on image: "${slide.headline}". Modern minimal style.`;
      const encodedPrompt = encodeURIComponent(imagePrompt);
      
      // Berikan URL-nya ke Frontend, biarkan browser pengunjung yang mendownload gambarnya!
      slide.imgSrc = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true`;
      slidesWithImages.push(slide);
    }

    parsedData.slides = slidesWithImages;
    parsedData.ratio = aspectRatio;
    parsedData.platform = platform;
    
    return res.status(200).json(parsedData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Terjadi kesalahan saat memproses.' });
  }
}
