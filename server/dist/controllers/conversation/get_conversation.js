"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_conversation_by_participant = void 0;
const conversation_1 = __importDefault(require("../../models/conversation"));
const logger_1 = require("../../utils/logger");
const get_conversation_by_participant = async (socket_id) => {
    try {
        return await conversation_1.default.findOne({
            participants: socket_id,
            is_active: true
        });
    }
    catch (error) {
        logger_1.logger.error('Lỗi khi tìm conversation:', error);
        throw error;
    }
};
exports.get_conversation_by_participant = get_conversation_by_participant;
