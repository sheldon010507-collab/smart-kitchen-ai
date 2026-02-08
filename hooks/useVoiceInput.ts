import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 语音输入状态类型
 */
export type VoiceInputStatus = 'idle' | 'listening' | 'processing' | 'error';

/**
 * 语音输入配置选项
 */
export interface VoiceInputOptions {
    lang?: string;
    continuous?: boolean;
    interimResults?: boolean;
    maxAlternatives?: number;
}

/**
 * 语音输入 Hook 返回值
 */
export interface UseVoiceInputReturn {
    transcript: string;
    isListening: boolean;
    isSupported: boolean;
    status: VoiceInputStatus;
    error: string | null;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
}

/**
 * 自定义 Hook: 使用 Web Speech API 进行语音识别
 * 
 * @param options - 语音识别配置选项
 * @returns 语音输入状态和控制方法
 * 
 * @example
 * ```tsx
 * const { transcript, isListening, startListening, stopListening } = useVoiceInput({
 *   lang: 'zh-CN',
 *   continuous: false
 * });
 * ```
 */
export const useVoiceInput = (options: VoiceInputOptions = {}): UseVoiceInputReturn => {
    const {
        lang = 'zh-CN',
        continuous = false,
        interimResults = true,
        maxAlternatives = 1,
    } = options;

    const [transcript, setTranscript] = useState<string>('');
    const [isListening, setIsListening] = useState<boolean>(false);
    const [status, setStatus] = useState<VoiceInputStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState<boolean>(false);

    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // 检查浏览器支持
    useEffect(() => {
        const SpeechRecognition =
            window.SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (SpeechRecognition) {
            setIsSupported(true);
            recognitionRef.current = new SpeechRecognition();
        } else {
            setIsSupported(false);
            console.warn('Web Speech API is not supported in this browser');
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    // 配置语音识别
    useEffect(() => {
        if (!recognitionRef.current) return;

        const recognition = recognitionRef.current;
        recognition.lang = lang;
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.maxAlternatives = maxAlternatives;

        // 识别结果处理
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcriptPart = result[0].transcript;

                if (result.isFinal) {
                    finalTranscript += transcriptPart;
                } else {
                    interimTranscript += transcriptPart;
                }
            }

            // 优先使用最终结果，否则使用临时结果
            const newTranscript = finalTranscript || interimTranscript;
            setTranscript(newTranscript);

            // 如果是最终结果，更新状态
            if (finalTranscript) {
                setStatus('processing');
            }
        };

        // 识别开始
        recognition.onstart = () => {
            setIsListening(true);
            setStatus('listening');
            setError(null);
            console.log('Voice recognition started');
        };

        // 识别结束
        recognition.onend = () => {
            setIsListening(false);
            setStatus(transcript ? 'processing' : 'idle');
            console.log('Voice recognition ended');
        };

        // 错误处理
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            setIsListening(false);
            setStatus('error');

            let errorMessage = '语音识别失败';

            switch (event.error) {
                case 'no-speech':
                    errorMessage = '未检测到语音，请重试';
                    break;
                case 'audio-capture':
                    errorMessage = '无法访问麦克风';
                    break;
                case 'not-allowed':
                    errorMessage = '麦克风权限被拒绝';
                    break;
                case 'network':
                    errorMessage = '网络错误，请检查连接';
                    break;
                case 'aborted':
                    errorMessage = '语音识别已取消';
                    break;
                case 'language-not-supported':
                    errorMessage = '不支持该语言';
                    break;
                default:
                    errorMessage = `语音识别错误: ${event.error}`;
            }

            setError(errorMessage);
            console.error('Speech recognition error:', event.error);
        };
    }, [lang, continuous, interimResults, maxAlternatives, transcript]);

    // 开始监听
    const startListening = useCallback(() => {
        if (!recognitionRef.current || !isSupported) {
            setError('浏览器不支持语音识别');
            return;
        }

        if (isListening) {
            console.warn('Already listening');
            return;
        }

        try {
            setTranscript('');
            setError(null);
            recognitionRef.current.start();
        } catch (err) {
            console.error('Failed to start recognition:', err);
            setError('启动语音识别失败');
            setStatus('error');
        }
    }, [isSupported, isListening]);

    // 停止监听
    const stopListening = useCallback(() => {
        if (!recognitionRef.current || !isListening) {
            return;
        }

        try {
            recognitionRef.current.stop();
        } catch (err) {
            console.error('Failed to stop recognition:', err);
        }
    }, [isListening]);

    // 重置转录文本
    const resetTranscript = useCallback(() => {
        setTranscript('');
        setError(null);
        setStatus('idle');
    }, []);

    return {
        transcript,
        isListening,
        isSupported,
        status,
        error,
        startListening,
        stopListening,
        resetTranscript,
    };
};
