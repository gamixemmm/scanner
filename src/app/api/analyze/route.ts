import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { image, skinType, concerns, ingredients, localIssues } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const systemPrompt = `You are a professional cosmetic advisor. You do not provide medical diagnoses and you do not identify individuals. You only provide cosmetic advice and explain ingredient compatibility based on the image provided and the user's characteristics.

Analyze the provided image and determine the presence of these specific cosmetic conditions on the skin:
- acne
- redness
- hyperpigmentation
- texture
- scarring

IMPORTANT - When to set "face_detected":
- Set "face_detected" to false ONLY when there is literally NO human face visible in the image (e.g. empty image, wrong photo, only objects). In that case return valid JSON with face_detected: false and empty arrays.
- Set "face_detected" to true whenever ANY human face is visible — even if blurry or partially cropped — and provide the full cosmetic analysis.

Return the response STRICTLY as a JSON object with the following structure:
{
  "face_detected": true or false,
  "issues": ["list", "of", "detected", "issues", "from", "the", "categories", "above"],
  "routine_advice": {
    "morning": ["step 1", "step 2"],
    "evening": ["step 1", "step 2"]
  },
  "recommendations": {
    "ingredients_to_look_for": ["ingredient 1", "ingredient 2"],
    "ingredients_to_avoid": ["ingredient 1", "ingredient 2"]
  },
  "summary": "A short, encouraging 2-sentence summary of the overall cosmetic approach."
}

Do not include any Markdown tags like \`\`\`json in the response, just the raw JSON.
Never use terms like 'diagnose', 'cure', or 'treat'. Always use 'may', 'appears', 'based on profile'.`;

    const extraLocalContext = localIssues && localIssues.length > 0
      ? `\n\nCRITICAL SYSTEM NOTE: During a multi-angle 3D face scan, local sensors PRE-DETECTED the following regional issues (including sides of the face potentially hidden in this frontal image): ${localIssues.join(', ')}. YOU MUST INCLUDE THESE ISSUES in your final "issues" JSON array output.`
      : '';

    const userMessageContent = `User skin type: ${skinType || 'Not specified'}
User concerns: ${concerns || 'Not specified'}
Product ingredients: ${ingredients || 'Not specified'}${extraLocalContext}

Analyze the image and generate professional cosmetic guidance based on the specified parameters.`;

    const base64Data = image.startsWith('data:image') ? image.split(',')[1] : image;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userMessageContent },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Data}`, detail: 'high' },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    const aiResponseText = response.choices[0]?.message?.content;
    if (!aiResponseText) throw new Error('No response generated from OpenAI');

    return NextResponse.json(JSON.parse(aiResponseText));

  } catch (error: any) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image and generate advice.' },
      { status: 500 }
    );
  }
}
