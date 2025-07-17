"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_messages_by_conversation = void 0;
const messages_1 = __importDefault(require("../../models/messages"));
const logger_1 = require("../../utils/logger");
const get_messages_by_conversation = async (conversation_id) => {
    try {
        const messages = await messages_1.default.find({ conversation_id })
            .sort({ created_at: 1 })
            .lean();
        logger_1.logger.debug(`Lấy ${messages.length} tin nhắn của cuộc trò chuyện ${conversation_id}`);
        return messages;
    }
    catch (error) {
        logger_1.logger.error('Lỗi khi lấy tin nhắn:', error);
        throw error;
    }
};
exports.get_messages_by_conversation = get_messages_by_conversation;
