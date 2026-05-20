import React, { useEffect, useRef, useState } from 'react';

export default function PrivacyMaskManager({
    cameraId,
    token,
    masks = [],
    onChange
}) {
    const canvasRef = useRef(null);

    const [snapshot, setSnapshot] = useState('');
    const [currentPoints, setCurrentPoints] = useState([]);
    const [localMasks, setLocalMasks] = useState([]);

    useEffect(() => {
        try {
            const parsed = typeof masks === 'string'
                ? JSON.parse(masks)
                : masks;

            setLocalMasks(parsed || []);
        } catch {
            setLocalMasks([]);
        }
    }, [masks]);

    useEffect(() => {
        if (!cameraId || !token) return;

        fetch(`/api/cameras/${cameraId}/frame?raw=true`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
            .then(res => res.blob())
            .then(blob => {
                setSnapshot(URL.createObjectURL(blob));
            })
            .catch(() => {
                setSnapshot('');
            });
    }, [cameraId, token]);

    useEffect(() => {
        draw();
    }, [localMasks, currentPoints]);

    const draw = () => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        localMasks.forEach(mask => {
            if (!mask.points || mask.points.length < 2) {
                return;
            }

            ctx.beginPath();

            ctx.moveTo(
                mask.points[0][0] * canvas.width,
                mask.points[0][1] * canvas.height
            );

            for (let i = 1; i < mask.points.length; i++) {
                ctx.lineTo(
                    mask.points[i][0] * canvas.width,
                    mask.points[i][1] * canvas.height
                );
            }

            ctx.closePath();

            ctx.fillStyle = 'rgba(255,0,0,0.4)';
            ctx.fill();

            ctx.strokeStyle = 'red';
            ctx.stroke();
        });

        if (currentPoints.length > 0) {
            ctx.beginPath();

            ctx.moveTo(
                currentPoints[0][0] * canvas.width,
                currentPoints[0][1] * canvas.height
            );

            for (let i = 1; i < currentPoints.length; i++) {
                ctx.lineTo(
                    currentPoints[i][0] * canvas.width,
                    currentPoints[i][1] * canvas.height
                );
            }

            ctx.strokeStyle = 'blue';
            ctx.stroke();
        }
    };

    const handleClick = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();

        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        setCurrentPoints([
            ...currentPoints,
            [x, y]
        ]);
    };

    const finishPolygon = () => {
        if (currentPoints.length < 3) {
            return;
        }

        const updated = [
            ...localMasks,
            { points: currentPoints }
        ];

        setLocalMasks(updated);
        setCurrentPoints([]);

        onChange(JSON.stringify(updated));
    };

    const removeMask = (index) => {
        const updated = localMasks.filter((_, i) => i !== index);

        setLocalMasks(updated);

        onChange(JSON.stringify(updated));
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={finishPolygon}
                    className="px-3 py-1 bg-blue-500 text-white rounded"
                >
                    Finish Polygon
                </button>

                <button
                    type="button"
                    onClick={() => setCurrentPoints([])}
                    className="px-3 py-1 bg-gray-500 text-white rounded"
                >
                    Clear
                </button>
            </div>

            <div className="relative border rounded overflow-hidden">
                {snapshot && (
                    <img
                        src={snapshot}
                        alt=""
                        className="w-full"
                    />
                )}

                <canvas
                    ref={canvasRef}
                    width={800}
                    height={450}
                    onClick={handleClick}
                    className="absolute inset-0 w-full h-full cursor-crosshair"
                />
            </div>

            <div className="space-y-2">
                {localMasks.map((mask, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between border rounded px-2 py-1"
                    >
                        <span>
                            Mask #{index + 1}
                        </span>

                        <button
                            type="button"
                            onClick={() => removeMask(index)}
                            className="text-red-500"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}