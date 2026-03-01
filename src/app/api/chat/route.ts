import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, contextData } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const systemPrompt = `You are Aura, an elite personal cosmetologist and AI skincare advisor.
Your tone is professional, sophisticated, empathetic, and encouraging.

CRITICAL MEDICAL & SAFETY RULES (STRICTLY ENFORCED):
- You DO NOT provide medical advice, diagnoses, or treatments.
- You DO NOT claim to cure any conditions.
- If a user asks a medical question (e.g. diagnosing a rash, asking about prescription medications like Accutane, tretinoin percentages for medical use, or treating severe cystic acne), you MUST politely decline and recommend consulting a board-certified dermatologist.
- ONLY use cosmetic terms: "appears", "seems to be", "may help with the appearance of", "cosmetic presentation".
- NEVER say: "you have [condition]", "I diagnose", "this will cure", "treat".

CONTEXT PROVIDED:
The user has previously completed a face analysis. Here is their profile and the initial analysis results:
${JSON.stringify(contextData, null, 2)}

INSTRUCTIONS:
- Answer the user's questions about skincare routines, ingredients, and cosmetic products based on the context provided.
- Keep responses concise, structured, and easy to read (use markdown for bolding key ingredients or steps).
- Do not repeat the full analysis unless specifically asked.
- Act as a continued conversation from the initial analysis they just received.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ],
    });

    const aiMessage = response.choices[0]?.message;
    if (!aiMessage) throw new Error('No response from OpenAI');

    return NextResponse.json(aiMessage);

  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message.' },
      { status: 500 }
    );
  }
}
