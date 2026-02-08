import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVoiceInput } from '../../hooks/useVoiceInput';

// Mock SpeechRecognition
class MockSpeechRecognition {
    continuous = false;
    interimResults = false;
    lang = '';
    maxAlternatives = 1;

    onstart: ((event: Event) => void) | null = null;
    onend: ((event: Event) => void) | null = null;
    onresult: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;

    start() {
        if (this.onstart) {
            this.onstart(new Event('start'));
        }
    }

    stop() {
        if (this.onend) {
            this.onend(new Event('end'));
        }
    }

    abort() {
        if (this.onend) {
            this.onend(new Event('end'));
        }
    }

    // Helper method to simulate recognition result
    simulateResult(transcript: string, isFinal: boolean = true) {
        if (this.onresult) {
            const mockEvent = {
                resultIndex: 0,
                results: [
                    {
                        0: { transcript, confidence: 0.9 },
                        isFinal,
                        length: 1,
                        item: (index: number) => ({ transcript, confidence: 0.9 }),
                    },
                ],
            };
            this.onresult(mockEvent);
        }
    }

    // Helper method to simulate error
    simulateError(error: string) {
        if (this.onerror) {
            this.onerror({ error, message: error });
        }
    }
}

describe('useVoiceInput', () => {
    let mockRecognition: MockSpeechRecognition;

    beforeEach(() => {
        mockRecognition = new MockSpeechRecognition();

        // Mock window.SpeechRecognition with proper constructor
        const MockConstructor = function (this: any) {
            return mockRecognition;
        } as any;
        MockConstructor.prototype = MockSpeechRecognition.prototype;

        (window as any).SpeechRecognition = MockConstructor;
        (window as any).webkitSpeechRecognition = MockConstructor;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('应该初始化为 idle 状态', () => {
        const { result } = renderHook(() => useVoiceInput());

        expect(result.current.isListening).toBe(false);
        expect(result.current.transcript).toBe('');
        expect(result.current.status).toBe('idle');
        expect(result.current.error).toBeNull();
        expect(result.current.isSupported).toBe(true);
    });

    it('应该在浏览器不支持时返回 isSupported: false', () => {
        // Remove SpeechRecognition support
        delete (window as any).SpeechRecognition;
        delete (window as any).webkitSpeechRecognition;

        const { result } = renderHook(() => useVoiceInput());

        expect(result.current.isSupported).toBe(false);
    });

    it('应该在调用 startListening 后开始监听', () => {
        const { result } = renderHook(() => useVoiceInput());

        act(() => {
            result.current.startListening();
        });

        expect(result.current.isListening).toBe(true);
        expect(result.current.status).toBe('listening');
    });

    it('应该在识别成功后更新 transcript', () => {
        const { result } = renderHook(() => useVoiceInput());

        act(() => {
            result.current.startListening();
        });

        act(() => {
            mockRecognition.simulateResult('买牛奶', true);
        });

        expect(result.current.transcript).toBe('买牛奶');
        expect(result.current.status).toBe('processing');
    });

    it('应该在调用 stopListening 后停止监听', () => {
        const { result } = renderHook(() => useVoiceInput());

        act(() => {
            result.current.startListening();
        });

        expect(result.current.isListening).toBe(true);

        act(() => {
            result.current.stopListening();
        });

        expect(result.current.isListening).toBe(false);
    });

    it('应该正确处理权限拒绝错误', () => {
        const { result } = renderHook(() => useVoiceInput());

        act(() => {
            result.current.startListening();
        });

        act(() => {
            mockRecognition.simulateError('not-allowed');
        });

        expect(result.current.status).toBe('error');
        expect(result.current.error).toBe('麦克风权限被拒绝');
        expect(result.current.isListening).toBe(false);
    });

    it('应该正确处理无语音错误', () => {
        const { result } = renderHook(() => useVoiceInput());

        act(() => {
            result.current.startListening();
        });

        act(() => {
            mockRecognition.simulateError('no-speech');
        });

        expect(result.current.status).toBe('error');
        expect(result.current.error).toBe('未检测到语音，请重试');
    });

    it('应该正确处理网络错误', () => {
        const { result } = renderHook(() => useVoiceInput());

        act(() => {
            result.current.startListening();
        });

        act(() => {
            mockRecognition.simulateError('network');
        });

        expect(result.current.status).toBe('error');
        expect(result.current.error).toBe('网络错误，请检查连接');
    });

    it('应该在调用 resetTranscript 后清空文本', () => {
        const { result } = renderHook(() => useVoiceInput());

        act(() => {
            result.current.startListening();
        });

        act(() => {
            mockRecognition.simulateResult('测试文本', true);
        });

        expect(result.current.transcript).toBe('测试文本');

        act(() => {
            result.current.resetTranscript();
        });

        expect(result.current.transcript).toBe('');
        expect(result.current.error).toBeNull();
        expect(result.current.status).toBe('idle');
    });

    it('应该支持自定义语言配置', () => {
        const { result } = renderHook(() => useVoiceInput({ lang: 'en-US' }));

        act(() => {
            result.current.startListening();
        });

        expect(mockRecognition.lang).toBe('en-US');
    });

    it('应该支持 continuous 模式配置', () => {
        const { result } = renderHook(() => useVoiceInput({ continuous: true }));

        act(() => {
            result.current.startListening();
        });

        expect(mockRecognition.continuous).toBe(true);
    });

    it('应该处理临时识别结果', () => {
        const { result } = renderHook(() => useVoiceInput({ interimResults: true }));

        act(() => {
            result.current.startListening();
        });

        act(() => {
            mockRecognition.simulateResult('临时', false);
        });

        expect(result.current.transcript).toBe('临时');
        expect(result.current.status).toBe('listening'); // 临时结果不改变状态为 processing
    });

    it('应该在已经监听时阻止重复启动', () => {
        const { result } = renderHook(() => useVoiceInput());
        const startSpy = vi.spyOn(mockRecognition, 'start');

        act(() => {
            result.current.startListening();
        });

        expect(startSpy).toHaveBeenCalledTimes(1);

        act(() => {
            result.current.startListening();
        });

        // Should not call start again
        expect(startSpy).toHaveBeenCalledTimes(1);
    });
});
