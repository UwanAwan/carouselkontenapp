import { GoogleGenAI } from '@google/genai';

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
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Minta Gemini membuatkan teks konten carousel
    const prompt = `Buatkan konten carousel untuk ${platform} dengan rasio ${ratio} sebanyak ${slidesCount} slide. 
    Topik: "${topic}".
    Berikan hasilnya dalam format JSON murni berupa array of objects, di mana setiap object punya property "title" (judul singkat, max 5 kata) dan "content" (poin penjelasan singkat). Jangan pakai markdown backtick, langsung JSON saja.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let rawText = response.text.trim();
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const slidesData = JSON.parse(rawText);

    // Kita buatkan gambar background bersih menggunakan generator URL publik yang aman dari limit
    const finalSlides = slidesData.map((slide, index) => {
      const bgColors = ['1e293b', '0f172a', '312e81', '14532d', '701a75'];
      const randomBg = bgColors[index % bgColors.length];
      
      // Menggunakan background CSS/SVG dinamis yang di-generate via URL instan (Tanpa Limit)
      const encodedTitle = encodeURIComponent(slide.title);
      const encodedContent = encodeURIComponent(slide.content);
      
      // Menggunakan layanan placeholder gambar bersih bernuansa profesional
      const imageUrl = `https://placehold.co/1080x1920/${randomBg}/ffffff/png?text=${encodedTitle}&font=montserrat`;

      return {
        title: slide.title,
        content: slide.content,
        imageUrl: imageUrl
      };
    });

    return res.status(200).json({ slides: finalSlides });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Gagal memproses AI: ' + error.message });
  }
}
