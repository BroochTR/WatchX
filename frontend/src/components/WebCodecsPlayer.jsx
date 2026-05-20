import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const WebCodecsPlayer = ({ camera }) => {
    const { token } = useAuth();

    const canvasRef = useRef(null);
    const wsRef = useRef(null);
    const decoderRef = useRef(null);

    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!camera?.id) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const protocol =
            window.location.protocol === 'https:' ? 'wss:' : 'ws:';

        const wsUrl =
            `${protocol}//${window.location.host}` +
            `/api/cameras/${camera.id}/ws?token=${encodeURIComponent(token)}`;

        const decoder = new VideoDecoder({
            output: (frame) => {
                try {
                    if (
                        canvas.width !== frame.displayWidth ||
                        canvas.height !== frame.displayHeight
                    ) {
                        canvas.width = frame.displayWidth;
                        canvas.height = frame.displayHeight;
                    }

                    ctx.drawImage(
                        frame,
                        0,
                        0,
                        frame.displayWidth,
                        frame.displayHeight
                    );
                } finally {
                    frame.close();
                }
            },
            error: (err) => {
                console.error('[WebCodecs] Decoder error:', err);
            },
        });

        decoder.configure({
            codec: 'avc1.42E01E',
            optimizeForLatency: true,
        });

        decoderRef.current = decoder;

        const ws = new WebSocket(wsUrl);

        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            console.log('[WebCodecs] Connected');
            setConnected(true);
        };

        ws.onclose = () => {
            console.log('[WebCodecs] Disconnected');
            setConnected(false);
        };

        ws.onerror = (err) => {
            console.error('[WebCodecs] WS error:', err);
        };

        ws.onmessage = (event) => {
            const buffer = event.data;

            if (!(buffer instanceof ArrayBuffer)) return;

            if (buffer.byteLength < 10) return;

            try {
                const view = new DataView(buffer);

                const isKeyframe = view.getUint8(1) === 1;

                const timestamp =
                    Math.floor(view.getFloat64(2, true) * 1_000_000);

                const naluBytes = new Uint8Array(buffer, 10);

                decoder.decode(
                    new EncodedVideoChunk({
                        type: isKeyframe ? 'key' : 'delta',
                        timestamp,
                        data: naluBytes,
                    })
                );
            } catch (err) {
                console.error('[WebCodecs] Decode failed:', err);
            }
        };

        wsRef.current = ws;

        return () => {
            try {
                ws.close();
            } catch (_) {}

            try {
                decoder.close();
            } catch (_) {}
        };
    }, [camera?.id, token]);

    return (
        <div className="absolute inset-0 bg-black">
            <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
            />

            {!connected && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                    Connecting...
                </div>
            )}
        </div>
    );
};