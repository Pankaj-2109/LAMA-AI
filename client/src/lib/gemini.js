import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_PUBLIC_KEY
);

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
];

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  safetySettings,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryWithBackoff(fn, retries = 2, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    const errorMsg = error.message ? error.message.toLowerCase() : "";
    const isTransientOrDemand =
      errorMsg.includes("503") ||
      errorMsg.includes("high demand") ||
      errorMsg.includes("service unavailable") ||
      errorMsg.includes("resource exhausted") ||
      errorMsg.includes("429") ||
      error.status === 503 ||
      error.status === 429;

    if (isTransientOrDemand && retries > 0) {
      console.warn(
        `Gemini API error encountered (${error.message}). Retrying in ${delay}ms... (${retries} retries left)`
      );
      await sleep(delay);
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const generateGeminiStream = async (chatHistory, messageParts) => {
  const primaryModelName = "gemini-2.5-flash";
  const fallbackModelName = "gemini-1.5-flash";

  const runWithModel = async (modelName) => {
    const modelInstance = genAI.getGenerativeModel({
      model: modelName,
      safetySettings,
    });
    const chat = modelInstance.startChat({ history: chatHistory });
    return await chat.sendMessageStream(messageParts);
  };

  try {
    return await retryWithBackoff(() => runWithModel(primaryModelName), 2, 1000);
  } catch (primaryError) {
    const errorMsg = primaryError.message ? primaryError.message.toLowerCase() : "";
    const isTransientOrDemand =
      errorMsg.includes("503") ||
      errorMsg.includes("high demand") ||
      errorMsg.includes("service unavailable") ||
      errorMsg.includes("resource exhausted") ||
      errorMsg.includes("429") ||
      primaryError.status === 503 ||
      primaryError.status === 429;

    if (isTransientOrDemand) {
      console.warn(
        `Primary model ${primaryModelName} failed due to demand/transient error. Falling back to ${fallbackModelName}...`
      );
      return await retryWithBackoff(() => runWithModel(fallbackModelName), 2, 1000);
    }
    throw primaryError;
  }
};

export default model;