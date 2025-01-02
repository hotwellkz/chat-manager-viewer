import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.post('/api/prompt', async (req, res) => {
  try {
    const { prompt, framework } = req.body;

    // Формируем системный промт для получения структурированного ответа
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates structured responses for code generation. Always return response in JSON format with fields: files (array of file objects with path and content), description (string with explanation)."
        },
        { role: "user", content: prompt }
      ],
    });

    // Парсим ответ от OpenAI
    const response = JSON.parse(completion.choices[0].message.content);

    // Если есть файлы для сохранения, сохраняем их
    if (response.files && response.files.length > 0) {
      for (const file of response.files) {
        const filePath = path.join(uploadsDir, file.path);
        const fileDir = path.dirname(filePath);
        
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, file.content);
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process prompt' });
  }
});

app.post('/api/files', async (req, res) => {
  try {
    const { files } = req.body;
    const results = [];

    for (const file of files) {
      const filePath = path.join(uploadsDir, file.path);
      const fileDir = path.dirname(filePath);
      
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, file.content);
      
      results.push({
        path: file.path,
        url: `/uploads/${file.path}`
      });
    }

    res.json({ files: results });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to save files' });
  }
});

app.use('/uploads', express.static(uploadsDir));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});