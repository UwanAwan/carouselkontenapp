export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, platform, ratio, slidesCount, password } = req.body;

  // Cek Password Keamanan
  if (password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Password salah atau tidak valid!' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY belum disetel di Vercel!');
    }

    const prompt = `Buatkan konten carousel untuk ${platform} dengan rasio ${ratio} sebanyak ${slidesCount} slide. Topik: "${topic}". Berikan hasilnya dalam format JSON murni berupa array of objects, di mana setiap object punya property "title" (judul singkat max 5 kata) dan "content" (poin penjelasan singkat). Jangan pakai markdown backtick, langsung JSON array saja.`;

    // Memanggil API Gemini langsung menggunakan fetch bawaan (Tanpa Install Library Tambahan)
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await geminiRes.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Gagal dari Google Gemini');
    }

    let rawText = data.candidates[0].content.parts[0].text.trim();
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const slidesData = JSON.parse(rawText);

    const finalSlides = slidesData.map((slide, index) => {
      const bgColors = ['1e293b', '0f172a', '312e81', '14532d', '701a75'];
      const randomBg = bgColors[index % bgColors.length];
      const encodedTitle = encodeURIComponent(slide.title);
      
      const imageUrl = `https://placehold.co/1080x1920/${randomBg}/ffffff/png?text=${encodedTitle}&font=montserrat`;

      return {
        title: slide.title,
        content: slide.content,
        imageUrl: imageUrl
      };
    });

    return res.status(200).json({ slides: finalSlides });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({ error: 'Server Error: ' + error.message });
  }
}
