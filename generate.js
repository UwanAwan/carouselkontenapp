// File: api/generate.js
// Ini adalah Backend Anda. Kode di sini TIDAK AKAN PERNAH bisa dilihat oleh pengunjung web.

export default async function handler(req, res) {
  // Hanya izinkan request POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Ambil data yang dikirim dari Frontend
  const { topic, numSlides, platform, aspectRatio, password } = req.body;

  // 2. CEK PASSWORD (Keamanan agar tidak sembarang orang bisa pakai)
  // Password ini akan kita atur di Dashboard Vercel nantinya
  if (password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Password salah atau tidak valid!' });
  }

  // 3. Ambil API KEY Gemini dari Dashboard Vercel (Sangat Aman)
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key belum diatur di server.' });
  }

  try {
    // --- PROSES 1: MINTA TEKS KE GEMINI ---
    const textPrompt = `Kamu adalah seorang expert content creator ${platform}. Buatkan konten carousel sebanyak ${numSlides} slide dengan topik '${topic}'. Gunakan bahasa Indonesia yang menarik. INSTRUKSI KHUSUS: Slide 1 adalah Cover clickbait. Kembalikan HANYA format JSON persis seperti ini: {"slides": [{"slideNumber": 1, "headline": "Judul", "subtext": "Teks", "visualPrompt": "Deskripsi gambar inggris detail"}], "caption": "Caption IG", "hashtags": "#tag"}`;
    
    const textUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
    const textResponse = await fetch(textUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: textPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const textData = await textResponse.json();
    const jsonText = textData.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedData = JSON.parse(jsonText);

    // --- PROSES 2: MINTA GAMBAR KE GEMINI UNTUK TIAP SLIDE ---
    const slidesWithImages = [];
    const imageUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;

    for (let i = 0; i < parsedData.slides.length; i++) {
      const slide = parsedData.slides[i];
      const imagePrompt = `Create a carousel slide design (aspect ratio ${aspectRatio}) for ${platform}. Visual background: ${slide.visualPrompt}. Style: Modern, inspiring. MUST write exact text: Headline: "${slide.headline}", Subtext: "${slide.subtext}", Page: "${slide.slideNumber}/${numSlides}". Use good contrast.`;

      const imgResponse = await fetch(imageUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: imagePrompt }] }],
          generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspectRatio } }
        })
      });

      const imgData = await imgResponse.json();
      const base64Data = imgData?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      const mimeType = imgData?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.mimeType || 'image/jpeg';
      
      slide.imgSrc = base64Data ? `data:${mimeType};base64,${base64Data}` : `https://placehold.co/900x1600/333/fff?text=Image+Failed`;
      slidesWithImages.push(slide);
    }

    parsedData.slides = slidesWithImages;
    parsedData.ratio = aspectRatio;
    parsedData.platform = platform;

    // 4. Kirim hasil yang sudah jadi ke pengguna
    return res.status(200).json(parsedData);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Terjadi kesalahan saat memproses di server.' });
  }
}
