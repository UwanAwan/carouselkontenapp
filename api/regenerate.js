// File: api/regenerate.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { slide, ratio, platform, numSlides, password } = req.body;
  
  if (password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Password salah!' });
  }

  try {
    const isCover = slide.slideNumber === 1;
    const extraStyle = isCover ? "Eye-catching COVER SLIDE, bold typography." : "Professional infographic layout.";
    const imagePrompt = `Carousel design for ${platform}. Background: ${slide.visualPrompt}. Style: ${extraStyle}. Write text: "${slide.headline}"`;
    
    let width = 900; let height = 1600;
    if(ratio === '1:1') { width = 1080; height = 1080; }
    else if(ratio === '4:5') { width = 1080; height = 1350; }
    else if(ratio === '16:9') { width = 1920; height = 1080; }

    // Tambahkan angka acak (timestamp) agar selalu menghasilkan gambar baru (tidak di-cache)
    const randomSeed = Date.now();
    const encodedPrompt = encodeURIComponent(imagePrompt);
    const newImgUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${randomSeed}&nologo=true`;

    return res.status(200).json({ imgSrc: newImgUrl });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan jaringan.' });
  }
}
