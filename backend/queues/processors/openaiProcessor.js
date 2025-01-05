import { initOpenAI } from '../../utils/openai.js';

export const processOpenAIRequest = async (job) => {
  const { prompt, userId } = job.data;
  console.log('Processing OpenAI request:', { userId });

  try {
    const openai = await initOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates structured responses for code generation."
        },
        { role: "user", content: prompt }
      ],
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI processing error:', error);
    throw error;
  }
};