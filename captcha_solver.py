import cv2
import numpy as np


def solve_captcha(bg_path, slider_path):
    """
    Mencari jarak (pixel X) yang harus digeser untuk memecahkan sliding puzzle captcha.

    Strategi yang digunakan (semakin banyak = semakin akurat):
    1. Edge Shadow Detection (Silhouette Edge Matching) - SANGAT AKURAT
    2. Multi-scale Template Matching (Vertically Constrained)
    3. Color Histogram Similarity (HSV)
    4. Masked Template Matching (Vertically Constrained)
    5. Sobel Gradient Comparison (Vertically Constrained)

    Returns: jarak drag dalam pixel
    """

    bg_color = cv2.imread(bg_path)
    bg_gray = cv2.imread(bg_path, cv2.IMREAD_GRAYSCALE)
    pz = cv2.imread(slider_path, cv2.IMREAD_UNCHANGED)

    if bg_gray is None or pz is None:
        print("[CAPTCHA] Error: Gagal membaca gambar")
        return 0

    # ============================================================
    # Parse slider (puzzle piece)
    # ============================================================
    has_alpha = len(pz.shape) == 3 and pz.shape[2] == 4

    if has_alpha:
        alpha = pz[:, :, 3]
        yr, xr = np.where(alpha > 10)
        if len(yr) == 0:
            print("[CAPTCHA] Error: Alpha channel kosong")
            return 0
        y1, y2 = min(yr), max(yr) + 1
        x1_pz, x2_pz = min(xr), max(xr) + 1

        pz_crop_bgr = pz[y1:y2, x1_pz:x2_pz]
        pz_crop_gray = cv2.cvtColor(pz_crop_bgr, cv2.COLOR_BGR2GRAY)
        mask_crop = alpha[y1:y2, x1_pz:x2_pz]
        _, mask_binary = cv2.threshold(mask_crop, 127, 255, cv2.THRESH_BINARY)
    else:
        pz_crop_gray = pz if len(pz.shape) == 2 else cv2.cvtColor(pz, cv2.COLOR_BGR2GRAY)
        mask_binary = np.ones_like(pz_crop_gray) * 255
        y1, x1_pz = 0, 0
        x2_pz = pz_crop_gray.shape[1]
        y2 = pz_crop_gray.shape[0]

    pz_h, pz_w = pz_crop_gray.shape[:2]
    bg_h, bg_w = bg_gray.shape[:2]

    results = []

    # ============================================================
    # STRATEGY 1: Edge Shadow Detection (Silhouette Edge Matching)
    # Menggunakan Canny Edges dari alpha mask (bukan texture) agar tidak
    # terganggu texture puzzle. Mencari outline siluet di background.
    # ============================================================
    try:
        # Deteksi edge di background utuh terlebih dahulu (menjaga kualitas blur)
        bg_blur = cv2.GaussianBlur(bg_gray, (3, 3), 0)
        bg_edges = cv2.Canny(bg_blur, 30, 90)

        # Potong secara vertikal sesuai posisi y1:y2 puzzle piece
        bg_edges_cropped = bg_edges[y1:y2, :]

        # Deteksi edge puzzle piece menggunakan alpha mask (hanya outline luar)
        pz_edge = cv2.Canny(mask_binary, 50, 150)

        # Template match edge puzzle di background edges yang sudah di-crop vertikal
        if pz_h <= bg_edges_cropped.shape[0] and pz_w <= bg_w:
            res = cv2.matchTemplate(bg_edges_cropped, pz_edge, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(res)

            if max_val > 0.15:  # threshold yang bersahabat untuk pencocokan tepi siluet
                results.append(("edge_shadow", max_loc[0], max_val))

    except Exception as e:
        print(f"[CAPTCHA] Strategy 1 error: {e}")

    # ============================================================
    # STRATEGY 2: Multi-scale Template Matching (Vertically Constrained)
    # ============================================================
    try:
        bg_gray_cropped = bg_gray[y1:y2, :]
        if pz_h <= bg_gray_cropped.shape[0] and pz_w <= bg_w:
            # Normalize untuk lighting invariance
            pz_norm = cv2.normalize(pz_crop_gray, None, 0, 255, cv2.NORM_MINMAX)
            bg_norm = cv2.normalize(bg_gray_cropped, None, 0, 255, cv2.NORM_MINMAX)

            # CCOEFF_NORMED & SQDIFF_NORMED
            res = cv2.matchTemplate(bg_norm, pz_norm, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(res)
            if max_val > 0.25:
                results.append(("template_norm", max_loc[0], max_val))

            res_sq = cv2.matchTemplate(bg_norm, pz_norm, cv2.TM_SQDIFF_NORMED)
            min_val, _, min_loc, _ = cv2.minMaxLoc(res_sq)
            if min_val < 0.4:
                results.append(("template_sqdiff", min_loc[0], 1.0 - min_val))

    except Exception as e:
        print(f"[CAPTCHA] Strategy 2 error: {e}")

    # ============================================================
    # STRATEGY 3: Color Histogram Similarity (HSV)
    # ============================================================
    try:
        if has_alpha and bg_color is not None:
            pz_hsv = cv2.cvtColor(pz_crop_bgr, cv2.COLOR_BGR2HSV)
            bg_hsv = cv2.cvtColor(bg_color, cv2.COLOR_BGR2HSV)

            # Histogram puzzle piece
            pz_hist = cv2.calcHist([pz_hsv], [0, 1], mask_binary, [24, 28], [0, 180, 0, 256])
            cv2.normalize(pz_hist, pz_hist, 0, 1, cv2.NORM_MINMAX)

            best_x = 0
            best_corr = -1

            # Slide window dengan step 2 (dipersempit dari 3 untuk akurasi)
            search_width = bg_w - pz_w
            for sx in range(0, max(1, search_width), 2):
                if y1 + pz_h > bg_h:
                    break

                roi = bg_hsv[y1:y1+pz_h, sx:sx+pz_w]
                if roi.shape != pz_hsv.shape[:2] + (3,):
                    continue

                roi_hist = cv2.calcHist([roi], [0, 1], mask_binary, [24, 28], [0, 180, 0, 256])
                cv2.normalize(roi_hist, roi_hist, 0, 1, cv2.NORM_MINMAX)

                corr = cv2.compareHist(pz_hist, roi_hist, cv2.HISTCMP_CORREL)

                if corr > best_corr:
                    best_corr = corr
                    best_x = sx

            if best_corr > 0.25:
                results.append(("histogram_sim", best_x, best_corr))

    except Exception as e:
        print(f"[CAPTCHA] Strategy 3 error: {e}")

    # ============================================================
    # STRATEGY 4: Masked Template Matching (Vertically Constrained)
    # ============================================================
    try:
        if has_alpha:
            bg_gray_cropped = bg_gray[y1:y2, :]
            if pz_h <= bg_gray_cropped.shape[0] and pz_w <= bg_w:
                res = cv2.matchTemplate(
                    bg_gray_cropped, pz_crop_gray, cv2.TM_CCOEFF_NORMED, mask=mask_binary
                )
                _, max_val, _, max_loc = cv2.minMaxLoc(res)

                if max_val > 0.3:
                    results.append(("masked_template", max_loc[0], max_val))

    except Exception as e:
        print(f"[CAPTCHA] Strategy 4 error: {e}")

    # ============================================================
    # STRATEGY 5: Sobel Gradient Comparison (Vertically Constrained)
    # ============================================================
    try:
        pz_sobel_x = cv2.Sobel(pz_crop_gray, cv2.CV_64F, 1, 0, ksize=3)
        pz_sobel_y = cv2.Sobel(pz_crop_gray, cv2.CV_64F, 0, 1, ksize=3)
        pz_mag = cv2.magnitude(pz_sobel_x, pz_sobel_y)

        best_x = 0
        best_score = -1

        bg_gray_cropped = bg_gray[y1:y2, :]

        for sx in range(0, max(1, bg_w - pz_w), 2):
            if sx + pz_w > bg_w:
                continue

            roi = bg_gray_cropped[:, sx:sx+pz_w]
            if roi.shape != pz_crop_gray.shape:
                continue

            roi_sx = cv2.Sobel(roi, cv2.CV_64F, 1, 0, ksize=3)
            roi_sy = cv2.Sobel(roi, cv2.CV_64F, 0, 1, ksize=3)
            roi_mag = cv2.magnitude(roi_sx, roi_sy)

            # Hitung similarity score
            score = cv2.matchTemplate(
                np.float32(pz_mag), np.float32(roi_mag), cv2.TM_CCOEFF_NORMED
            )
            _, local_max, _, _ = cv2.minMaxLoc(score)

            if local_max > best_score:
                best_score = local_max
                best_x = sx

        if best_score > 0.25:
            results.append(("sobel_gradient", best_x, best_score))

    except Exception as e:
        print(f"[CAPTCHA] Strategy 5 error: {e}")

    # ============================================================
    # CONSENSUS
    # ============================================================
    if not results:
        print("[CAPTCHA] No strategies confident. Using fallback.")
        return bg_w // 3  # Fallback: assume puzzle is in first third

    results.sort(key=lambda r: r[2], reverse=True)

    # Log
    for name, x, conf in results:
        print(f"  [{name}] x={x}, conf={conf:.3f}")

    # Consensus: 2+ strategies agree within 15px (dipersempit dari 25 untuk presisi tinggi)
    confident_positions = [r[1] for r in results if r[2] > 0.35]
    if len(confident_positions) >= 2:
        for i, p1 in enumerate(confident_positions):
            cluster = [p2 for p2 in confident_positions if abs(p1 - p2) <= 15]
            if len(cluster) >= 2:
                consensus = int(np.mean(cluster))
                print(f"  [CONSENSUS] {len(cluster)} strategies agree -> x={consensus}")
                return consensus

    # Best single
    best = results[0]
    print(f"  [SELECTED] {best[0]} -> x={best[1]} (conf={best[2]:.3f})")
    return best[1]
