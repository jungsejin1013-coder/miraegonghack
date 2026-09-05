import { put, list } from '@vercel/blob';

export default async function handler(req, res) {
  // CORS 및 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. 게시글 불러오기
  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: 'posts-data.json' });
      if (blobs.length === 0) {
        return res.status(200).json([]);
      }
      
      const response = await fetch(blobs[0].url, { cache: 'no-store' });
      const posts = await response.json();
      return res.status(200).json(posts);
    } catch (error) {
      return res.status(500).json({ error: '불러오기 실패: ' + error.message });
    }
  }

  // 2. 게시글 및 사진 등록하기
  if (req.method === 'POST') {
    try {
      const { title, content, imageBase64, imageName } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
      }

      let imageUrl = null;

      // 이미지 업로드 (Vercel Blob)
      if (imageBase64 && imageName) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const imageBlob = await put(`images/${Date.now()}-${imageName}`, buffer, {
          access: 'public',
          addRandomSuffix: true
        });
        imageUrl = imageBlob.url;
      }

      // 기존 게시글 목록 가져오기
      let posts = [];
      const { blobs } = await list({ prefix: 'posts-data.json' });
      if (blobs.length > 0) {
        try {
          const response = await fetch(blobs[0].url, { cache: 'no-store' });
          posts = await response.json();
        } catch (e) {
          posts = [];
        }
      }

      // 새 글 객체 생성
      const newPost = {
        id: Date.now(),
        title,
        content,
        image_url: imageUrl,
        likes: 0,
        created_at: new Date().toISOString()
      };

      posts.unshift(newPost); // 맨 앞에 추가

      // 게시글 데이터(JSON) 저장 (Vercel Blob)
      await put('posts-data.json', JSON.stringify(posts), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrites: true
      });

      return res.status(200).json(newPost);
    } catch (error) {
      return res.status(500).json({ error: '저장 실패: ' + error.message });
    }
  }
}
