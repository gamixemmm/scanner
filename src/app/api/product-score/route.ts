import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { scanResult, productName } = await req.json();

        if (!scanResult || !productName) {
            return NextResponse.json(
                { error: 'Missing scan results or product name' },
                { status: 400 }
            );
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are a cosmetic product compatibility expert. Given a user's skin analysis results and a cosmetic product, evaluate how well this product matches the user's skin needs.

Return ONLY a JSON object with this exact structure:
{
  "score": <number 0-100>,
  "reasoning": "<1-2 sentence explanation of why this score>"
}

Scoring guidelines:
- 90-100: Excellent match — product directly addresses detected issues with beneficial ingredients
- 70-89: Good match — product is generally suitable and unlikely to cause problems
- 50-69: Moderate match — product may help some issues but could aggravate others
- 30-49: Poor match — product likely not suitable for this skin profile
- 0-29: Bad match — product contains ingredients that could worsen detected conditions

Do not include any Markdown formatting, just raw JSON.`,
                },
                {
                    role: 'user',
                    content: `User's skin scan results: ${JSON.stringify(scanResult)}

Product being evaluated: ${productName}

Evaluate how well this product matches this user's skin profile and return the score.`,
                },
            ],
            response_format: { type: 'json_object' },
        });

        const aiText = response.choices[0]?.message?.content;
        if (!aiText) throw new Error('No response from OpenAI');

        const parsed = JSON.parse(aiText);
        return NextResponse.json(parsed);
    } catch (error: any) {
        console.error('Error scoring product:', error);
        return NextResponse.json(
            { error: 'Failed to score product compatibility.' },
            { status: 500 }
        );
    }
}
