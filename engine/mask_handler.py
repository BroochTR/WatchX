import cv2
import json
import numpy as np
import logging

logger = logging.getLogger(__name__)


def parse_polygons(mask_json):
    polygons = []

    if not mask_json:
        return polygons

    try:
        data = json.loads(mask_json)

        for poly in data:
            points = []

            for pt in poly.get("points", []):
                if isinstance(pt, dict):
                    points.append([pt["x"], pt["y"]])
                else:
                    points.append(pt)

            if len(points) >= 3:
                polygons.append(points)

    except Exception as e:
        logger.error(f"Failed to parse masks: {e}")

    return polygons


def apply_masks(frame, polygons):
    if not polygons:
        return frame

    h, w = frame.shape[:2]

    for poly in polygons:
        try:
            pts = np.array(
                [[int(x * w), int(y * h)] for x, y in poly],
                np.int32
            )

            cv2.fillPoly(frame, [pts], (0, 0, 0))

        except Exception as e:
            logger.error(f"Failed to apply mask: {e}")

    return frame