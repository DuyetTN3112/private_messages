"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.save_message = void 0;
const messages_1 = __importDefault(require("../../models/messages"));
const conversation_1 = __importDefault(require("../../models/conversation"));
const logger_1 = require("../../utils/logger");
const save_message = async (conversation_id, sender, content) => {
    try {
        const message = new messages_1.default({
            conversation_id,
            sender,
            content
        });
        await message.save();
        await conversation_1.default.findByIdAndUpdate(conversation_id, {
            last_activity: new Date()
        });
        logger_1.logger.debug(`Tin nhắn mới lưu thành công - Conversation: ${conversation_id}, Sender: ${sender}`);
        return message;
    }
    catch (error) {
        logger_1.logger.error('Lỗi khi lưu tin nhắn:', error);
        throw error;
    }
};
exports.save_message = save_message;
