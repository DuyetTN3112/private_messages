"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.end_conversation = void 0;
const conversation_1 = __importDefault(require("../../models/conversation"));
const messages_1 = __importDefault(require("../../models/messages"));
const logger_1 = require("../../utils/logger");
const end_conversation = async (conversation_id) => {
    try {
        // Tìm và xóa tất cả tin nhắn trong cuộc trò chuyện
        const result = await messages_1.default.deleteMany({ conversation_id });
        logger_1.logger.info(`Đã xóa ${result.deletedCount} tin nhắn của cuộc trò chuyện ${conversation_id}`);
        // Xóa cuộc trò chuyện
        await conversation_1.default.findByIdAndDelete(conversation_id);
        logger_1.logger.info(`Đã kết thúc cuộc trò chuyện ${conversation_id}`);
        return true;
    }
    catch (error) {
        logger_1.logger.error('Lỗi khi kết thúc conversation:', error);
        throw error;
    }
};
exports.end_conversation = end_conversation;
