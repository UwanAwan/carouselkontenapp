// File: api/regenerate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { slide, ratio, platform, numSlides, password } = req.body;
  
  if (password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Password salah!' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const imageUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;

  try {
    const isCover = slide.slideNumber === 1;
    const extraStyle = isCover ? "Eye-catching COVER SLIDE, bold typography." : "Professional infographic layout.";
    const imagePrompt = `Carousel slide design (ratio ${ratio}) for ${platform}. Background: ${slide.visualPrompt}. Style: ${extraStyle}. MUST write text: Headline: "${slide.headline}", Subtext: "${slide.subtext}", Page: "${slide.slideNumber}/${numSlides}".`;

    const imgResponse = await fetch(imageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: imagePrompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: ratio } } })
    });

    const imgData = await imgResponse.json();
    const base64Data = imgData?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    
    if (base64Data) {
      const mimeType = imgData.candidates[0].content.parts.find(p => p.inlineData).inlineData.mimeType || 'image/jpeg';
      return res.status(200).json({ imgSrc: `data:${mimeType};base64,${base64Data}` });
    } else {
      return res.status(500).json({ error: 'Google AI gagal membuat gambar ini.' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan jaringan.' });
  }
}
