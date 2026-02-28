import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60; // Max execution time for Vercel

export async function POST(req: Request) {
  try {
    const { image, skinType, concerns, ingredients } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const systemPrompt = `You are a professional cosmetic advisor. You do not provide medical diagnoses and you do not identify individuals (biometrics). You only provide cosmetic advice and explain ingredient compatibility based on the image provided and the user's characteristics. 
    
Analyze the provided face image ONLY to determine the presence of these specific cosmetic conditions:
- acne
- redness
- hyperpigmentation
- texture
- scarring

Return the response STRICTLY as a JSON object with the following structure:
{
  "issues": ["list", "of", "detected", "issues", "from", "the", "categories", "above"],
  "routine_advice": {
    "morning": ["step 1", "step 2", "etc"],
    "evening": ["step 1", "step 2", "etc"]
  },
  "recommendations": {
    "ingredients_to_look_for": ["ingredient 1", "ingredient 2"],
    "ingredients_to_avoid": ["ingredient 1", "ingredient 2"]
  },
  "summary": "A short, encouraging 2-sentence summary of the overall cosmetic approach."
}

Do not include any Markdown tags like \`\`\`json in the response, just the raw JSON.
Remember: Do NOT use terms like 'diagnose', 'cure', or 'treat'. ALWAYS use terms like 'may', 'appears', 'based on profile'.`;

    const userMessageContent = `
User skin type: ${skinType || 'Not specified'}
User concerns: ${concerns || 'Not specified'}
Product ingredients: ${ingredients || 'Not specified'}

Analyze the image and generate professional cosmetic guidance based on the specified parameters.
    `;

    // Process the base64 image
    const base64Data = image.startsWith('data:image') ? image.split(',')[1] : image;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            { type: "text", text: userMessageContent },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
                detail: "low"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    const aiResponseText = response.choices[0]?.message?.content;

    if (!aiResponseText) {
      throw new Error("No response generated from OpenAI");
    }

    // Parse the JSON string
    return NextResponse.json(JSON.parse(aiResponseText));

  } catch (error: any) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "Failed to analyze image and generate advice." },
      { status: 500 }
    );
  }
}
