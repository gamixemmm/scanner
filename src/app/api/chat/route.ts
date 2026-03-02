import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, contextData } = await req.json();
    
    console.log('[Chat API] Request received');
    console.log('[Chat API] Messages count:', messages?.length);
    console.log('[Chat API] Context data:', contextData ? 'Present' : 'Missing');

    if (!messages || !Array.isArray(messages)) {
      console.error('[Chat API] Invalid messages format');
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const hasFaceAnalysis = contextData?.analysisResult || contextData?.userProfile?.skinType !== 'Unknown';
    
    const systemPrompt = `You are Aura, an elite personal cosmetologist and AI skincare advisor.
Your tone is professional, sophisticated, empathetic, and encouraging.

CRITICAL MEDICAL & SAFETY RULES (STRICTLY ENFORCED):
- You DO NOT provide medical advice, diagnoses, or treatments.
- You DO NOT claim to cure any conditions.
- If a user asks a medical question (e.g. diagnosing a rash, asking about prescription medications like Accutane, tretinoin percentages for medical use, or treating severe cystic acne), you MUST politely decline and recommend consulting a board-certified dermatologist.
- ONLY use cosmetic terms: "appears", "seems to be", "may help with the appearance of", "cosmetic presentation".
- NEVER say: "you have [condition]", "I diagnose", "this will cure", "treat".

CONTEXT PROVIDED:
${hasFaceAnalysis ? `The user has completed a face analysis. Here is their profile and analysis results:
${JSON.stringify(contextData, null, 2)}` : `The user has NOT completed a face analysis yet. They only scanned a product.
Product information: ${JSON.stringify(contextData?.scannedProduct, null, 2)}`}

INSTRUCTIONS:
- Answer the user's questions about skincare routines, ingredients, and cosmetic products based on the context provided.
- Keep responses concise, structured, and easy to read (use markdown for bolding key ingredients or steps).
${!hasFaceAnalysis ? `- IMPORTANT: Since the user hasn't done a face scan yet, encourage them to complete a face analysis on the main page for personalized recommendations. Explain that you can provide general information about the product, but for truly personalized advice about compatibility with their skin, they should scan their face first.
- Provide general information about the product's ingredients and typical use cases, but emphasize that personalized recommendations require a face scan.` : '- Use their face analysis data to provide personalized recommendations about product compatibility.'}
- Do not repeat the full analysis unless specifically asked.
- Act as a continued conversation from the initial analysis they just received.`;

    console.log('[Chat API] Has face analysis:', hasFaceAnalysis);

    console.log('[Chat API] Calling OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ],
    });

    console.log('[Chat API] OpenAI response received');

    const aiMessage = response.choices[0]?.message;
    if (!aiMessage) {
      console.error('[Chat API] No message in OpenAI response');
      throw new Error('No response from OpenAI');
    }

    console.log('[Chat API] Sending response to client');
    return NextResponse.json(aiMessage);

  } catch (error: any) {
    console.error('[Chat API] Error:', error.message);
    console.error('[Chat API] Full error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message.', details: error.message },
      { status: 500 }
    );
  }
}
