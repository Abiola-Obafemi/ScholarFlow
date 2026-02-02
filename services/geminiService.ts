
import { GoogleGenAI } from "@google/genai";
import { Assignment, Class } from "../types";

export const getStudyTips = async (assignments: Assignment[], classes: Class[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const activeAssignments = assignments.filter(a => !a.completed);
  const classMap = new Map(classes.map(c => [c.id, c.name]));

  const assignmentList = activeAssignments.map(a => 
    `- ${a.name} (Class: ${classMap.get(a.classId)}, Due: ${a.dueDate})`
  ).join('\n');

  const prompt = `
    I am a student with the following upcoming assignments:
    ${assignmentList}

    Please act as a supportive study coach. Provide:
    1. A recommended prioritization list.
    2. One actionable study tip for each high-priority item.
    3. A motivational closing sentence.
    
    Keep it concise, friendly, and structured in Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return "I'm having trouble connecting to your study coach right now. Please try again later!";
  }
};
