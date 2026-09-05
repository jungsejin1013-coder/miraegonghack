import { sql } from '@neondatabase/serverless';
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const posts = await sql`SELECT * FROM posts ORDER BY created_at DESC`;
      return res.status(200).json(posts);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, content, imageBase64, imageName } = req.body;
      let imageUrl = null;

      if (imageBase64 && imageName) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = await put(`posts/${Date.now()}-${imageName}`, buffer, { access: 'public' });
        imageUrl = blob.url;
      }

      const result = await sql`
        INSERT INTO posts (title, content, image_url)
        VALUES (${title}, ${content}, ${imageUrl})
        RETURNING *;
      `;
      return res.status(200).json(result[0]);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}
