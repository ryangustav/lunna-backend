import { ChatPrompt } from "../../../domain/entities/ChatPrompt";
import { ChatResponse } from "../../../domain/entities/ChatResponse";


export default class GenerateChatResponse {
    constructor() {}

    execute(chatPrompt: ChatPrompt): ChatResponse {

   return {
       text: "test",
       truncated: false
   }
    }
}