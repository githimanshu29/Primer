import dotenv from "dotenv";
dotenv.config();

import { ChatBedrockConverse } from "@langchain/aws";

const model = new ChatBedrockConverse({
  region: "us-east-1",
  model: "Llama 3.1 70B",
});

async function main() {
  try {
    const response = await model.invoke([
      {
        role: "user",
        content: "Who is virat kohli, tell me about himself?",
      },
    ]);

    console.log("\nAI Response:\n");
    console.log(response.content);
  } catch (error) {
    console.error("Error:\n", error);
  }
}

main();
