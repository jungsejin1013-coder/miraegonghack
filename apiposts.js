import { sql } from '@neondatabase/serverless';
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. 게시글 목록 불러오기 (GET)
  if (req.method === 'GET') {
    try {
      const posts = await sql`SELECT * FROM posts ORDER BY created_at DESC`;
      return res.status(200).json(posts);
    } catch (error) {
      console.error('Neon DB Error:', error);
      return res.status(500).json({ error: 'DB 조회 실패: ' + error.message });
    }
  }

  // 2. 게시글 및 이미지 등록하기 (POST)
  if (req.method === 'POST') {
    try {
      const { title, content, imageBase64, imageName } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: '제목과 내용을 모두 입력해 주세요.' });
      }

      let imageUrl = null;

      // 이미지 파일이 있을 경우 Vercel Blob에 업로드
      if (imageBase64 && imageName) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        const blob = await put(`posts/${Date.now()}-${imageName}`, buffer, {
          access: 'public',
        });
        imageUrl = blob.url;
      }

      // Neon DB에 게시글 저장
      const result = await sql`
        INSERT INTO posts (title, content, image_url)
        VALUES (${title}, ${content}, ${imageUrl})
        RETURNING *;
      `;

      return res.status(200).json(result[0]);
    } catch (error) {
      console.error('Server Error:', error);
      return res.status(500).json({ error: '게시글 등록 실패: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}