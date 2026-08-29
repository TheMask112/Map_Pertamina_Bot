package com.mapbot.pertamina.engine

import com.mapbot.pertamina.util.Constants
import kotlinx.coroutines.delay
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import kotlin.random.Random

class PageInteractor(private val wvManager: WebViewManager) {

    suspend fun isLoginPage(): Boolean = suspendCoroutine { cont ->
        wvManager.executeJs("""
            (function() {
                var url = window.location.href.toLowerCase();
                if (url.includes('/login') || url.includes('/auth') || url.includes('/sign')) return 'true';
                var pwdInput = document.querySelector("input[type='password']");
                return pwdInput ? 'true' : 'false';
            })()
        """) { result ->
            cont.resume(result.replace("\"", "") == "true")
        }
    }

    suspend fun pageContainsText(text: String): Boolean = suspendCoroutine { cont ->
        wvManager.executeJs("""
            (function() {
                return document.body.innerText.toLowerCase().includes('${text.lowercase()}') ? 'true' : 'false';
            })()
        """) { result ->
            cont.resume(result.replace("\"", "") == "true")
        }
    }

    suspend fun doLogin(phone: String, pass: String) {
        for (i in 1..10) {
            val success = suspendCoroutine<Boolean> { cont ->
                wvManager.executeJs("""
                    (function() {
                        function simulateHumanTouch(el) {
                            if (!el) return false;
                            var rect = el.getBoundingClientRect();
                            var x = rect.left + rect.width / 2;
                            var y = rect.top + rect.height / 2;
                            el.focus();
                            try {
                                el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                            } catch(e) {}
                            try {
                                var touch = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                                el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true, cancelable: true }));
                            } catch(e) {}
                            el.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, buttons: 1, bubbles: true, cancelable: true }));
                            try {
                                el.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                            } catch(e) {}
                            try {
                                var touchEnd = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                                el.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touchEnd], bubbles: true, cancelable: true }));
                            } catch(e) {}
                            el.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, buttons: 0, bubbles: true, cancelable: true }));
                            el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, cancelable: true }));
                            if (typeof el.click === 'function') { el.click(); }
                            return true;
                        }

                        var phoneInput = document.querySelector("input[placeholder*='Nomor Ponsel'], input[placeholder*='Ponsel'], input[type='tel']");
                        var passInput = document.querySelector("input[type='password']");
                        var btn = document.querySelector("button[type='submit']");
                        
                        if (phoneInput && passInput && btn) {
                            var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                            
                            nativeInputValueSetter.call(phoneInput, '$phone');
                            phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
                            phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
                            
                            nativeInputValueSetter.call(passInput, '$pass');
                            passInput.dispatchEvent(new Event('input', { bubbles: true }));
                            passInput.dispatchEvent(new Event('change', { bubbles: true }));
                            
                            simulateHumanTouch(btn);
                            return 'true';
                        }
                        return 'false';
                    })()
                """) { result ->
                    cont.resume(result.replace("\"", "") == "true")
                }
            }
            if (success) {
                delay(2000)
                return
            }
            delay(1000)
        }
    }

    suspend fun clickButtonByText(buttonText: String): Boolean = suspendCoroutine { cont ->
        val safeText = buttonText.replace("\"", "\\\"").lowercase()
        wvManager.executeJs("""
            (function() {
                function simulateHumanTouch(el) {
                    if (!el) return false;
                    try {
                        el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
                    } catch(e) {}
                    var rect = el.getBoundingClientRect();
                    var x = rect.left + rect.width / 2;
                    var y = rect.top + rect.height / 2;
                    el.focus();
                    try {
                        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                    } catch(e) {}
                    try {
                        var touch = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                        el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true, cancelable: true }));
                    } catch(e) {}
                    el.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, buttons: 1, bubbles: true, cancelable: true }));
                    try {
                        el.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                    } catch(e) {}
                    try {
                        var touchEnd = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                        el.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touchEnd], bubbles: true, cancelable: true }));
                    } catch(e) {}
                    el.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, buttons: 0, bubbles: true, cancelable: true }));
                    el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, cancelable: true }));
                    if (typeof el.click === 'function') { el.click(); }
                    return true;
                }

                var targetText = "$safeText";

                // 1. Cek tombol utama (button, role=button, input submit)
                var buttons = document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"], a');
                for (var i = 0; i < buttons.length; i++) {
                    var btn = buttons[i];
                    var txt = (btn.innerText || btn.value || btn.textContent || '').trim().toLowerCase();
                    if (txt && (txt === targetText || (targetText.length > 2 && txt.includes(targetText)))) {
                        var rect = btn.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            return simulateHumanTouch(btn) ? 'true' : 'false';
                        }
                    }
                }

                // 2. Fallback jika ada elemen teks yang dapat diklik
                var els = document.querySelectorAll('div, span, p');
                var bestMatch = null;
                var minLength = 999999;
                for (var j = 0; j < els.length; j++) {
                    var el = els[j];
                    var elTxt = (el.innerText || el.textContent || '').trim().toLowerCase();
                    if (elTxt && (elTxt === targetText || (targetText.length > 2 && elTxt.includes(targetText)))) {
                        var elRect = el.getBoundingClientRect();
                        if (elRect.width > 0 && elRect.height > 0 && elTxt.length < minLength) {
                            minLength = elTxt.length;
                            bestMatch = el;
                        }
                    }
                }
                if (bestMatch) {
                    return simulateHumanTouch(bestMatch) ? 'true' : 'false';
                }
                return 'false';
            })()
        """) { result ->
            cont.resume(result.replace("\"", "") == "true")
        }
    }

    suspend fun fillNik(nik: String): Boolean = suspendCoroutine { cont ->
        wvManager.executeJs("""
            (function() {
                var selectors = [
                    "input[placeholder*='16 digit']",
                    "input[placeholder*='NIK']",
                    "input[data-testid='nikInput']",
                    "input[name*='nik']",
                    "input[type='search']",
                    "input[placeholder*='Masukkan']"
                ];
                var inp = null;
                for (var i = 0; i < selectors.length; i++) {
                    var el = document.querySelector(selectors[i]);
                    if (el && el.offsetParent !== null) {
                        inp = el;
                        break;
                    }
                }
                if (!inp) {
                    var all = document.querySelectorAll("input");
                    for (var j = 0; j < all.length; j++) {
                        var ph = (all[j].placeholder || all[j].name || '').toLowerCase();
                        if (ph.includes('nik') || ph.includes('16') || ph.includes('masukkan')) {
                            inp = all[j];
                            break;
                        }
                    }
                }
                if (!inp) return 'false';
                
                inp.focus();
                var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(inp, '');
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                
                nativeSetter.call(inp, '$nik');
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                inp.dispatchEvent(new Event('change', { bubbles: true }));
                inp.dispatchEvent(new Event('blur', { bubbles: true }));
                return 'true';
            })()
        """) { result ->
            cont.resume(result.replace("\"", "") == "true")
        }
    }

    suspend fun clickLanjutkan(): Boolean = suspendCoroutine { cont ->
        wvManager.executeJs("""
            (function() {
                function simulateHumanTouch(el) {
                    if (!el) return false;
                    var rect = el.getBoundingClientRect();
                    var x = rect.left + rect.width / 2;
                    var y = rect.top + rect.height / 2;
                    el.focus();
                    try {
                        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                    } catch(e) {}
                    try {
                        var touch = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                        el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true, cancelable: true }));
                    } catch(e) {}
                    el.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, buttons: 1, bubbles: true, cancelable: true }));
                    try {
                        el.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                    } catch(e) {}
                    try {
                        var touchEnd = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                        el.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touchEnd], bubbles: true, cancelable: true }));
                    } catch(e) {}
                    el.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, buttons: 0, bubbles: true, cancelable: true }));
                    el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, cancelable: true }));
                    if (typeof el.click === 'function') { el.click(); }
                    return true;
                }

                var btns = document.querySelectorAll('button, [role="button"]');
                for (var i = 0; i < btns.length; i++) {
                    var txt = btns[i].innerText ? btns[i].innerText.trim().toLowerCase() : '';
                    if (txt.includes('lanjutkan penjualan') || txt === 'lanjutkan' || txt.includes('lanjut')) {
                        if (btns[i].offsetParent !== null && !btns[i].disabled) {
                            return simulateHumanTouch(btns[i]) ? 'true' : 'false';
                        }
                    }
                }
                return 'false';
            })()
        """) { result ->
            cont.resume(result.replace("\"", "") == "true")
        }
    }

    suspend fun waitForLoadingToDisappear(maxSec: Int = 8) {
        for (i in 1..maxSec * 2) {
            val isLoading = suspendCoroutine<Boolean> { cont ->
                wvManager.executeJs("""
                    (function() {
                        var loaders = document.querySelectorAll('.mantine-Loader-root, [data-loading="true"], .loading, .spinner, [aria-busy="true"]');
                        for (var i = 0; i < loaders.length; i++) {
                            if (loaders[i] && loaders[i].offsetParent !== null) return 'true';
                        }
                        var disabledBtns = document.querySelectorAll('button[data-loading="true"]');
                        return disabledBtns.length > 0 ? 'true' : 'false';
                    })()
                """) { result ->
                    cont.resume(result.replace("\"", "") == "true")
                }
            }
            if (!isLoading) break
            delay(500)
        }
    }

    suspend fun getBodyText(): String = suspendCoroutine { cont ->
        wvManager.executeJs("document.body.innerText") { result ->
            cont.resume(result.replace("\"", ""))
        }
    }

    suspend fun isElementVisible(selector: String): Boolean = suspendCoroutine { cont ->
        val safeSelector = selector.replace("\"", "\\\"")
        wvManager.executeJs("""
            (function() {
                try {
                    var el = document.querySelector("$safeSelector");
                    if (!el) return 'false';
                    var rect = el.getBoundingClientRect();
                    return (rect.width > 0 && rect.height > 0) ? 'true' : 'false';
                } catch(e) { return 'false'; }
            })()
        """) { result ->
            cont.resume(result.replace("\"", "") == "true")
        }
    }

    suspend fun isElementVisibleByText(text: String): Boolean = suspendCoroutine { cont ->
        val safeText = text.replace("\"", "\\\"").lowercase()
        wvManager.executeJs("""
            (function() {
                var els = document.querySelectorAll('button, [role="button"], a, span, div, h1, h2, h3, p');
                var targetText = "$safeText";
                for (var i = 0; i < els.length; i++) {
                    if (els[i].innerText && els[i].innerText.trim().toLowerCase().includes(targetText)) {
                        var rect = els[i].getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) return 'true';
                    }
                }
                return 'false';
            })()
        """) { result ->
            cont.resume(result.replace("\"", "") == "true")
        }
    }

    suspend fun addTabung(count: Int) {
        val selectors = listOf(
            "[data-testid='actionIcon2']",
            ".styles_controlerAdd__z7cTN",
            "button:has(svg.icon-tabler-plus)"
        )
        for (i in 0 until count - 1) {
            for (sel in selectors) {
                val clicked = suspendCoroutine<Boolean> { cont ->
                    wvManager.executeJs("""
                        (function() {
                            function simulateHumanTouch(el) {
                                if (!el) return false;
                                var rect = el.getBoundingClientRect();
                                var x = rect.left + rect.width / 2;
                                var y = rect.top + rect.height / 2;
                                el.focus();
                                try {
                                    el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                                } catch(e) {}
                                try {
                                    var touch = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                                    el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true, cancelable: true }));
                                } catch(e) {}
                                el.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, buttons: 1, bubbles: true, cancelable: true }));
                                try {
                                    el.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                                } catch(e) {}
                                try {
                                    var touchEnd = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                                    el.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touchEnd], bubbles: true, cancelable: true }));
                                } catch(e) {}
                                el.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, buttons: 0, bubbles: true, cancelable: true }));
                                el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, cancelable: true }));
                                if (typeof el.click === 'function') { el.click(); }
                                return true;
                            }

                            var btn = document.querySelector("$sel");
                            if (btn) {
                                return simulateHumanTouch(btn) ? 'true' : 'false';
                            }
                            return 'false';
                        })()
                    """) { result ->
                        cont.resume(result.replace("\"", "") == "true")
                    }
                }
                if (clicked) break
            }
            delay(400)
        }
    }
    
    suspend fun clickElementBySelector(selector: String): Boolean = suspendCoroutine { cont ->
        val safeSelector = selector.replace("\"", "\\\"")
        wvManager.executeJs("""
            (function() {
                function simulateHumanTouch(el) {
                    if (!el) return false;
                    var rect = el.getBoundingClientRect();
                    var x = rect.left + rect.width / 2;
                    var y = rect.top + rect.height / 2;
                    el.focus();
                    try {
                        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                    } catch(e) {}
                    try {
                        var touch = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                        el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true, cancelable: true }));
                    } catch(e) {}
                    el.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, buttons: 1, bubbles: true, cancelable: true }));
                    try {
                        el.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                    } catch(e) {}
                    try {
                        var touchEnd = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                        el.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touchEnd], bubbles: true, cancelable: true }));
                    } catch(e) {}
                    el.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, buttons: 0, bubbles: true, cancelable: true }));
                    el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, cancelable: true }));
                    if (typeof el.click === 'function') { el.click(); }
                    return true;
                }

                var el = document.querySelector("$safeSelector");
                if (el) { return simulateHumanTouch(el) ? 'true' : 'false'; }
                return 'false';
            })()
        """) { result ->
            cont.resume(result.replace("\"", "") == "true")
        }
    }

    suspend fun getInputValue(selector: String): String = suspendCoroutine { cont ->
        val safeSelector = selector.replace("\"", "\\\"")
        wvManager.executeJs("""
            (function() {
                var el = document.querySelector("$safeSelector");
                return el ? el.value : '';
            })()
        """) { result ->
            cont.resume(result.replace("\"", ""))
        }
    }

    suspend fun scrollToElement(selector: String) {
        val safeSelector = selector.replace("\"", "\\\"")
        wvManager.executeJs("""
            (function() {
                var el = document.querySelector("$safeSelector");
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            })()
        """)
    }

    suspend fun getCurrentUrl(): String = suspendCoroutine { cont ->
        wvManager.executeJs("window.location.href") { result ->
            cont.resume(result.replace("\"", ""))
        }
    }

    suspend fun isPageLoaded(): Boolean = suspendCoroutine { cont ->
        wvManager.executeJs("document.readyState") { result ->
            cont.resume(result.replace("\"", "") == "complete")
        }
    }

    suspend fun fillTempatLahir(tempat: String): Boolean = suspendCoroutine { cont ->
        val safeTempat = tempat.replace("\"", "\\\"").uppercase()
        wvManager.executeJs("""
            (function() {
                var allInputs = document.querySelectorAll("input");
                for (var i = 0; i < allInputs.length; i++) {
                    var ph = (allInputs[i].placeholder || allInputs[i].name || allInputs[i].id || '').toLowerCase();
                    if (ph.includes('tempat') || ph.includes('lahir') || ph.includes('ketik')) {
                        allInputs[i].focus();
                        var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                        nativeSetter.call(allInputs[i], "$safeTempat");
                        allInputs[i].dispatchEvent(new Event('input', { bubbles: true }));
                        allInputs[i].dispatchEvent(new Event('change', { bubbles: true }));
                        allInputs[i].dispatchEvent(new Event('blur', { bubbles: true }));
                        return 'true';
                    }
                }
                return 'false';
            })()
        """) { res ->
            cont.resume(res.replace("\"", "") == "true")
        }
    }

    suspend fun selectMantineDropdown(fieldHint: String, targetVal: String): Boolean {
        // 1. Focus dan klik input select untuk memunculkan dropdown popup
        val opened = suspendCoroutine<Boolean> { cont ->
            val safeHint = fieldHint.replace("\"", "\\\"").lowercase()
            wvManager.executeJs("""
                (function() {
                    function simulateHumanTouch(el) {
                        if (!el) return false;
                        var rect = el.getBoundingClientRect();
                        var x = rect.left + rect.width / 2;
                        var y = rect.top + rect.height / 2;
                        el.focus();
                        try {
                            el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                        } catch(e) {}
                        try {
                            var touch = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                            el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true, cancelable: true }));
                        } catch(e) {}
                        el.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, buttons: 1, bubbles: true, cancelable: true }));
                        try {
                            el.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                        } catch(e) {}
                        try {
                            var touchEnd = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                            el.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touchEnd], bubbles: true, cancelable: true }));
                        } catch(e) {}
                        el.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, buttons: 0, bubbles: true, cancelable: true }));
                        el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, cancelable: true }));
                        if (typeof el.click === 'function') { el.click(); }
                        return true;
                    }

                    var hint = "$safeHint";
                    var inps = document.querySelectorAll("input, .mantine-Select-input, [data-testid*='Select'], [data-testid*='select']");
                    for (var i = 0; i < inps.length; i++) {
                        var ph = (inps[i].placeholder || inps[i].getAttribute('data-testid') || inps[i].name || inps[i].id || '').toLowerCase();
                        var isMatch = ph.includes(hint);
                        if (!isMatch && (hint === 'tgl' || hint === 'dayselect') && (ph.includes('tgl') || ph.includes('day') || ph.includes('tanggal') || ph.includes('hari'))) isMatch = true;
                        if (!isMatch && (hint === 'bln' || hint === 'monthselect') && (ph.includes('bln') || ph.includes('month') || ph.includes('bulan'))) isMatch = true;
                        if (!isMatch && (hint === 'thn' || hint === 'yearselect') && (ph.includes('thn') || ph.includes('year') || ph.includes('tahun'))) isMatch = true;

                        if (isMatch) {
                            return simulateHumanTouch(inps[i]) ? 'true' : 'false';
                        }
                    }
                    return 'false';
                })()
            """) { res ->
                cont.resume(res.replace("\"", "") == "true")
            }
        }
        if (!opened) return false
        delay(400)

        // 2. Cari dan klik item target dari list dropdown
        val selected = suspendCoroutine<Boolean> { cont ->
            val safeVal = targetVal.replace("\"", "\\\"").trim()
            wvManager.executeJs("""
                (function() {
                    function simulateHumanTouch(el) {
                        if (!el) return false;
                        var rect = el.getBoundingClientRect();
                        var x = rect.left + rect.width / 2;
                        var y = rect.top + rect.height / 2;
                        el.focus();
                        try {
                            el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                        } catch(e) {}
                        try {
                            var touch = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                            el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true, cancelable: true }));
                        } catch(e) {}
                        el.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, buttons: 1, bubbles: true, cancelable: true }));
                        try {
                            el.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                        } catch(e) {}
                        try {
                            var touchEnd = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                            el.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touchEnd], bubbles: true, cancelable: true }));
                        } catch(e) {}
                        el.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, buttons: 0, bubbles: true, cancelable: true }));
                        el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, cancelable: true }));
                        if (typeof el.click === 'function') { el.click(); }
                        return true;
                    }

                    var target = "$safeVal";
                    var targetNum = parseInt(target, 10);
                    var items = document.querySelectorAll('.mantine-Select-item, [role="option"], [data-combobox-option="true"], .mantine-Combobox-option, li');
                    for (var m = 0; m < items.length; m++) {
                        var itTxt = (items[m].innerText || items[m].textContent || '').trim();
                        var itNum = parseInt(itTxt, 10);
                        var isOptionMatch = false;

                        if (itTxt === target) {
                            isOptionMatch = true;
                        } else if (!isNaN(targetNum) && !isNaN(itNum) && targetNum === itNum) {
                            isOptionMatch = true;
                        } else if (target.length > 2 && itTxt.toLowerCase().includes(target.toLowerCase())) {
                            isOptionMatch = true;
                        }

                        if (isOptionMatch) {
                            items[m].scrollIntoView({ block: 'center', inline: 'center' });
                            return simulateHumanTouch(items[m]) ? 'true' : 'false';
                        }
                    }
                    return 'false';
                })()
            """) { res ->
                cont.resume(res.replace("\"", "") == "true")
            }
        }
        delay(350)
        return selected
    }

    suspend fun clickCheckboxesAndNext(): Boolean = suspendCoroutine { cont ->
        wvManager.executeJs("""
            (function() {
                function simulateHumanTouch(el) {
                    if (!el) return false;
                    var rect = el.getBoundingClientRect();
                    var x = rect.left + rect.width / 2;
                    var y = rect.top + rect.height / 2;
                    el.focus();
                    try {
                        el.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                    } catch(e) {}
                    try {
                        var touch = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                        el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true, cancelable: true }));
                    } catch(e) {}
                    el.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, buttons: 1, bubbles: true, cancelable: true }));
                    try {
                        el.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }));
                    } catch(e) {}
                    try {
                        var touchEnd = new Touch({ identifier: Date.now(), target: el, clientX: x, clientY: y, screenX: x, screenY: y, pageX: x, pageY: y });
                        el.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touchEnd], bubbles: true, cancelable: true }));
                    } catch(e) {}
                    el.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, buttons: 0, bubbles: true, cancelable: true }));
                    el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, cancelable: true }));
                    if (typeof el.click === 'function') { el.click(); }
                    return true;
                }

                var cbs = document.querySelectorAll("input[type='checkbox']");
                for (var c = 0; c < cbs.length; c++) {
                    if (!cbs[c].checked) { simulateHumanTouch(cbs[c]); }
                }
                var btns = document.querySelectorAll('button');
                for (var b = 0; b < btns.length; b++) {
                    if ((btns[b].innerText || '').toLowerCase().includes('selanjutnya')) {
                        return simulateHumanTouch(btns[b]) ? 'true' : 'false';
                    }
                }
                return 'false';
            })()
        """) { res ->
            cont.resume(res.replace("\"", "") == "true")
        }
    }

    suspend fun dismissKeyboard() {
        wvManager.executeJs("""
            (function() {
                try {
                    if (document.activeElement && typeof document.activeElement.blur === 'function') {
                        document.activeElement.blur();
                    }
                } catch(e) {}
            })()
        """)
    }

    suspend fun handleBirthDetails(nik: String, tempatLahirCustom: String = ""): Boolean {
        val cleanNik = nik.filter { it.isDigit() }
        if (cleanNik.length != 16) return false

        val rawDay = cleanNik.substring(6, 8).toIntOrNull() ?: 1
        val day = if (rawDay > 40) rawDay - 40 else rawDay
        val dayStr = day.toString()
        val dayStrPadded = String.format(java.util.Locale.US, "%02d", day)

        val month = (cleanNik.substring(8, 10).toIntOrNull() ?: 1).coerceIn(1, 12)
        val monthNames = listOf("", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember")
        val monthName = if (month < monthNames.size) monthNames[month] else "Januari"

        val rawYear = cleanNik.substring(10, 12).toIntOrNull() ?: 90
        val currentYear2d = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR) % 100
        val year = if (rawYear > currentYear2d) 1900 + rawYear else 2000 + rawYear
        val yearStr = year.toString()

        val tempatLahir = if (tempatLahirCustom.isNotEmpty()) {
            tempatLahirCustom.uppercase()
        } else {
            val kode4 = cleanNik.substring(0, 4)
            getCityNameFromKode(kode4)
        }

        // Loop polling multi-step hingga 15 detik
        for (attempt in 1..15) {
            // 0. Cek apakah sudah tiba di layar penjualan / cek pesanan
            if (isElementVisibleByText("CEK PESANAN") || isElementVisibleByText("PROSES PENJUALAN")) {
                return true
            }

            val bText = getBodyText().lowercase()

            // 1. Modal Sukses "Data Pelanggan berhasil diperbarui" (Prioritas Utama)
            if (bText.contains("berhasil diperbarui") || isElementVisibleByText("LANJUTKAN KE TRANSAKSI")) {
                dismissKeyboard()
                clickButtonByText("LANJUTKAN KE TRANSAKSI")
                delay(1500)
                continue
            }

            // 2. Modal Konfirmasi "Pastikan semua data sudah benar" (Prioritas Kedua)
            val isKonfirmasi = bText.contains("pastikan semua data") || 
                               bText.contains("ya, perbarui") || 
                               isElementVisibleByText("YA, PERBARUI DATA PELANGGAN") ||
                               isElementVisibleByText("PERBARUI DATA PELANGGAN")

            if (isKonfirmasi) {
                dismissKeyboard()
                val clicked = clickButtonByText("YA, PERBARUI DATA PELANGGAN") || 
                              clickButtonByText("PERBARUI DATA PELANGGAN") ||
                              clickButtonByText("YA, PERBARUI")
                delay(2500)
                continue
            }

            // 3. Modal "Data Pelanggan belum lengkap"
            if (bText.contains("data pelanggan belum lengkap") || bText.contains("lengkapi data dahulu")) {
                dismissKeyboard()
                clickButtonByText("UPDATE DATA PELANGGAN")
                delay(1500)
                continue
            }

            // 4. Pernyataan Persetujuan
            if (bText.contains("pernyataan persetujuan") || bText.contains("syarat dan ketentuan")) {
                dismissKeyboard()
                clickCheckboxesAndNext()
                delay(1500)
                continue
            }

            // 5. Choice Popup (Rumah Tangga)
            if (bText.contains("pilihan jenis") || bText.contains("pelanggan terdaftar")) {
                dismissKeyboard()
                clickButtonByText("Rumah Tangga")
                delay(400)
                clickButtonByText("LANJUTKAN")
                delay(1000)
                continue
            }

            // 6. Form Update Data Pelanggan (Hanya jika tidak ada modal overlay)
            val isFormTtl = bText.contains("lengkapi data pelanggan") || 
                            bText.contains("tempat lahir") || 
                            bText.contains("tanggal lahir") || 
                            isElementVisible("input[placeholder*='tempat lahir' i]") ||
                            isElementVisible("input[placeholder*='Tempat' i]")

            if (isFormTtl) {
                fillTempatLahir(tempatLahir)
                delay(350)

                val daySelected = selectMantineDropdown("tgl", dayStr)
                if (!daySelected) selectMantineDropdown("dayselect", dayStrPadded)
                delay(350)

                selectMantineDropdown("bln", monthName)
                delay(350)

                selectMantineDropdown("thn", yearStr)
                delay(500)

                dismissKeyboard()
                clickButtonByText("SELANJUTNYA")
                delay(2000)
                continue
            }

            delay(600)
        }

        return true
    }

    private fun getCityNameFromKode(kode4: String): String {
        val mapping = mapOf(
            "1101" to "ACEH SELATAN", "1102" to "ACEH TENGGARA", "1103" to "ACEH TIMUR", "1104" to "ACEH TENGAH",
            "1105" to "ACEH BARAT", "1106" to "ACEH BESAR", "1107" to "PIDIE", "1108" to "ACEH UTARA",
            "1109" to "SIMEULUE", "1110" to "ACEH SINGKIL", "1111" to "BIREUEN", "1112" to "ACEH BARAT DAYA",
            "1113" to "GAYO LUES", "1114" to "ACEH JAYA", "1115" to "NAGAN RAYA", "1116" to "ACEH TAMIANG",
            "1117" to "BENER MERIAH", "1118" to "PIDIE JAYA", "1171" to "KOTA BANDA ACEH", "1172" to "KOTA SABANG",
            "1173" to "KOTA LHOKSEUMAWE", "1174" to "KOTA LANGSA", "1175" to "KOTA SUBULUSSALAM", "1201" to "TAPANULI TENGAH",
            "1202" to "TAPANULI UTARA", "1203" to "TAPANULI SELATAN", "1204" to "NIAS", "1205" to "LANGKAT",
            "1206" to "KARO", "1207" to "DELI SERDANG", "1208" to "SIMALUNGUN", "1209" to "ASAHAN",
            "1210" to "LABUHANBATU", "1211" to "DAIRI", "1212" to "TOBA", "1213" to "MANDAILING NATAL",
            "1214" to "NIAS SELATAN", "1215" to "PAKPAK BHARAT", "1216" to "HUMBANG HASUNDUTAN", "1217" to "SAMOSIR",
            "1218" to "SERDANG BEDAGAI", "1219" to "BATU BARA", "1220" to "PADANG LAWAS UTARA", "1221" to "PADANG LAWAS",
            "1222" to "LABUHANBATU SELATAN", "1223" to "LABUHANBATU UTARA", "1224" to "NIAS UTARA", "1225" to "NIAS BARAT",
            "1271" to "KOTA MEDAN", "1272" to "KOTA PEMATANGSIANTAR", "1273" to "KOTA SIBOLGA", "1274" to "KOTA TANJUNGBALAI",
            "1275" to "KOTA BINJAI", "1276" to "KOTA TEBING TINGGI", "1277" to "KOTA PADANGSIDIMPUAN", "1278" to "KOTA GUNUNGSITOLI",
            "1301" to "PESISIR SELATAN", "1302" to "SOLOK", "1303" to "SIJUNJUNG", "1304" to "TANAH DATAR",
            "1305" to "PADANG PARIAMAN", "1306" to "AGAM", "1307" to "LIMA PULUH KOTA", "1308" to "PASAMAN",
            "1309" to "KEPULAUAN MENTAWAI", "1310" to "DHARMASRAYA", "1311" to "SOLOK SELATAN", "1312" to "PASAMAN BARAT",
            "1371" to "KOTA PADANG", "1372" to "KOTA SOLOK", "1373" to "KOTA SAWAHLUNTO", "1374" to "KOTA PADANG PANJANG",
            "1375" to "KOTA BUKITTINGGI", "1376" to "KOTA PAYAKUMBUH", "1377" to "KOTA PARIAMAN", "1401" to "KAMPAR",
            "1402" to "INDRAGIRI HULU", "1403" to "BENGKALIS", "1404" to "INDRAGIRI HILIR", "1405" to "PELALAWAN",
            "1406" to "ROKAN HULU", "1407" to "ROKAN HILIR", "1408" to "SIAK", "1409" to "KUANTAN SINGINGI",
            "1410" to "KEPULAUAN MERANTI", "1471" to "KOTA PEKANBARU", "1472" to "KOTA DUMAI", "1501" to "KERINCI",
            "1502" to "MERANGIN", "1503" to "SAROLANGUN", "1504" to "BATANGHARI", "1505" to "MUARO JAMBI",
            "1506" to "TANJUNG JABUNG BARAT", "1507" to "TANJUNG JABUNG TIMUR", "1508" to "BUNGO", "1509" to "TEBO",
            "1571" to "KOTA JAMBI", "1572" to "KOTA SUNGAI PENUH", "1601" to "OGAN KOMERING ULU", "1602" to "OGAN KOMERING ILIR",
            "1603" to "MUARA ENIM", "1604" to "LAHAT", "1605" to "MUSI RAWAS", "1606" to "MUSI BANYUASIN",
            "1607" to "BANYUASIN", "1608" to "OGAN KOMERING ULU TIMUR", "1609" to "OGAN KOMERING ULU SELATAN", "1610" to "OGAN ILIR",
            "1611" to "EMPAT LAWANG", "1612" to "PENUKAL ABAB LEMATANG ILIR", "1613" to "MUSI RAWAS UTARA", "1671" to "KOTA PALEMBANG",
            "1672" to "KOTA PAGAR ALAM", "1673" to "KOTA LUBUK LINGGAU", "1674" to "KOTA PRABUMULIH", "1701" to "BENGKULU SELATAN",
            "1702" to "REJANG LEBONG", "1703" to "BENGKULU UTARA", "1704" to "KAUR", "1705" to "SELUMA",
            "1706" to "MUKOMUKO", "1707" to "LEBONG", "1708" to "KEPAHIANG", "1709" to "BENGKULU TENGAH",
            "1771" to "KOTA BENGKULU", "1801" to "LAMPUNG SELATAN", "1802" to "LAMPUNG TENGAH", "1803" to "LAMPUNG UTARA",
            "1804" to "LAMPUNG BARAT", "1805" to "TULANG BAWANG", "1806" to "TANGGAMUS", "1807" to "LAMPUNG TIMUR",
            "1808" to "WAY KANAN", "1809" to "PESAWARAN", "1810" to "PRINGSEWU", "1811" to "MESUJI",
            "1812" to "TULANG BAWANG BARAT", "1813" to "PESISIR BARAT", "1871" to "KOTA BANDAR LAMPUNG", "1872" to "KOTA METRO",
            "1901" to "BANGKA", "1902" to "BELITUNG", "1903" to "BANGKA SELATAN", "1904" to "BANGKA TENGAH",
            "1905" to "BANGKA BARAT", "1906" to "BELITUNG TIMUR", "1971" to "KOTA PANGKAL PINANG", "2101" to "BINTAN",
            "2102" to "KARIMUN", "2103" to "NATUNA", "2104" to "LINGGA", "2105" to "KEPULAUAN ANAMBAS",
            "2171" to "KOTA BATAM", "2172" to "KOTA TANJUNG PINANG", "3101" to "ADMINISTRASI KEPULAUAN SERIBU", "3171" to "KOTA ADMINISTRASI JAKARTA PUSAT",
            "3172" to "KOTA ADMINISTRASI JAKARTA UTARA", "3173" to "KOTA ADMINISTRASI JAKARTA BARAT", "3174" to "KOTA ADMINISTRASI JAKARTA SELATAN", "3175" to "KOTA ADMINISTRASI JAKARTA TIMUR",
            "3201" to "BOGOR", "3202" to "SUKABUMI", "3203" to "CIANJUR", "3204" to "BANDUNG",
            "3205" to "GARUT", "3206" to "TASIKMALAYA", "3207" to "CIAMIS", "3208" to "KUNINGAN",
            "3209" to "CIREBON", "3210" to "MAJALENGKA", "3211" to "SUMEDANG", "3212" to "INDRAMAYU",
            "3213" to "SUBANG", "3214" to "PURWAKARTA", "3215" to "KARAWANG", "3216" to "BEKASI",
            "3217" to "BANDUNG BARAT", "3218" to "PANGANDARAN", "3271" to "KOTA BOGOR", "3272" to "KOTA SUKABUMI",
            "3273" to "KOTA BANDUNG", "3274" to "KOTA CIREBON", "3275" to "KOTA BEKASI", "3276" to "KOTA DEPOK",
            "3277" to "KOTA CIMAHI", "3278" to "KOTA TASIKMALAYA", "3279" to "KOTA BANJAR", "3301" to "CILACAP",
            "3302" to "BANYUMAS", "3303" to "PURBALINGGA", "3304" to "BANJARNEGARA", "3305" to "KEBUMEN",
            "3306" to "PURWOREJO", "3307" to "WONOSOBO", "3308" to "MAGELANG", "3309" to "BOYOLALI",
            "3310" to "KLATEN", "3311" to "SUKOHARJO", "3312" to "WONOGIRI", "3313" to "KARANGANYAR",
            "3314" to "SRAGEN", "3315" to "GROBOGAN", "3316" to "BLORA", "3317" to "REMBANG",
            "3318" to "PATI", "3319" to "KUDUS", "3320" to "JEPARA", "3321" to "DEMAK",
            "3322" to "SEMARANG", "3323" to "TEMANGGUNG", "3324" to "KENDAL", "3325" to "BATANG",
            "3326" to "PEKALONGAN", "3327" to "PEMALANG", "3328" to "TEGAL", "3329" to "BREBES",
            "3371" to "KOTA MAGELANG", "3372" to "KOTA SURAKARTA", "3373" to "KOTA SALATIGA", "3374" to "KOTA SEMARANG",
            "3375" to "KOTA PEKALONGAN", "3376" to "KOTA TEGAL", "3401" to "KULON PROGO", "3402" to "BANTUL",
            "3403" to "GUNUNGKIDUL", "3404" to "SLEMAN", "3471" to "KOTA YOGYAKARTA", "3501" to "PACITAN",
            "3502" to "PONOROGO", "3503" to "TRENGGALEK", "3504" to "TULUNGAGUNG", "3505" to "BLITAR",
            "3506" to "KEDIRI", "3507" to "MALANG", "3508" to "LUMAJANG", "3509" to "JEMBER",
            "3510" to "BANYUWANGI", "3511" to "BONDOWOSO", "3512" to "SITUBONDO", "3513" to "PROBOLINGGO",
            "3514" to "PASURUAN", "3515" to "SIDOARJO", "3516" to "MOJOKERTO", "3517" to "JOMBANG",
            "3518" to "NGANJUK", "3519" to "MADIUN", "3520" to "MAGETAN", "3521" to "NGAWI",
            "3522" to "BOJONEGORO", "3523" to "TUBAN", "3524" to "LAMONGAN", "3525" to "GRESIK",
            "3526" to "BANGKALAN", "3527" to "SAMPANG", "3528" to "PAMEKASAN", "3529" to "SUMENEP",
            "3571" to "KOTA KEDIRI", "3572" to "KOTA BLITAR", "3573" to "KOTA MALANG", "3574" to "KOTA PROBOLINGGO",
            "3575" to "KOTA PASURUAN", "3576" to "KOTA MOJOKERTO", "3577" to "KOTA MADIUN", "3578" to "KOTA SURABAYA",
            "3579" to "KOTA BATU", "3601" to "PANDEGLANG", "3602" to "LEBAK", "3603" to "TANGERANG",
            "3604" to "SERANG", "3671" to "KOTA TANGERANG", "3672" to "KOTA CILEGON", "3673" to "KOTA SERANG",
            "3674" to "KOTA TANGERANG SELATAN", "5101" to "JEMBRANA", "5102" to "TABANAN", "5103" to "BADUNG",
            "5104" to "GIANYAR", "5105" to "KLUNGKUNG", "5106" to "BANGLI", "5107" to "KARANGASEM",
            "5108" to "BULELENG", "5171" to "KOTA DENPASAR", "5201" to "LOMBOK BARAT", "5202" to "LOMBOK TENGAH",
            "5203" to "LOMBOK TIMUR", "5204" to "SUMBAWA", "5205" to "DOMPU", "5206" to "BIMA",
            "5207" to "SUMBAWA BARAT", "5208" to "LOMBOK UTARA", "5271" to "KOTA MATARAM", "5272" to "KOTA BIMA",
            "5301" to "KUPANG", "5302" to "TIMOR TENGAH SELATAN", "5303" to "TIMOR TENGAH UTARA", "5304" to "BELU",
            "5305" to "ALOR", "5306" to "FLORES TIMUR", "5307" to "SIKKA", "5308" to "ENDE",
            "5309" to "NGADA", "5310" to "MANGGARAI", "5311" to "SUMBA TIMUR", "5312" to "SUMBA BARAT",
            "5313" to "LEMBATA", "5314" to "ROTE NDAO", "5315" to "MANGGARAI BARAT", "5316" to "NAGEKEO",
            "5317" to "SUMBA TENGAH", "5318" to "SUMBA BARAT DAYA", "5319" to "MANGGARAI TIMUR", "5320" to "SABU RAIJUA",
            "5321" to "MALAKA", "5371" to "KOTA KUPANG", "6101" to "SAMBAS", "6102" to "MEMPAWAH",
            "6103" to "SANGGAU", "6104" to "KETAPANG", "6105" to "SINTANG", "6106" to "KAPUAS HULU",
            "6107" to "BENGKAYANG", "6108" to "LANDAK", "6109" to "SEKADAU", "6110" to "MELAWI",
            "6111" to "KAYONG UTARA", "6112" to "KUBU RAYA", "6171" to "KOTA PONTIANAK", "6172" to "KOTA SINGKAWANG",
            "6201" to "KOTAWARINGIN BARAT", "6202" to "KOTAWARINGIN TIMUR", "6203" to "KAPUAS", "6204" to "BARITO SELATAN",
            "6205" to "BARITO UTARA", "6206" to "KATINGAN", "6207" to "SERUYAN", "6208" to "SUKAMARA",
            "6209" to "LAMANDAU", "6210" to "GUNUNG MAS", "6211" to "PULANG PISAU", "6212" to "MURUNG RAYA",
            "6213" to "BARITO TIMUR", "6271" to "KOTA PALANGKARAYA", "6301" to "TANAH LAUT", "6302" to "KOTABARU",
            "6303" to "BANJAR", "6304" to "BARITO KUALA", "6305" to "TAPIN", "6306" to "HULU SUNGAI SELATAN",
            "6307" to "HULU SUNGAI TENGAH", "6308" to "HULU SUNGAI UTARA", "6309" to "TABALONG", "6310" to "TANAH BUMBU",
            "6311" to "BALANGAN", "6371" to "KOTA BANJARMASIN", "6372" to "KOTA BANJARBARU", "6401" to "PASER",
            "6402" to "KUTAI KARTANEGARA", "6403" to "BERAU", "6407" to "KUTAI BARAT", "6408" to "KUTAI TIMUR",
            "6409" to "PENAJAM PASER UTARA", "6411" to "MAHAKAM ULU", "6471" to "KOTA BALIKPAPAN", "6472" to "KOTA SAMARINDA",
            "6474" to "KOTA BONTANG", "6501" to "BULUNGAN", "6502" to "MALINAU", "6503" to "NUNUKAN",
            "6504" to "TANA TIDUNG", "6571" to "KOTA TARAKAN", "7101" to "BOLAANG MONGONDOW", "7102" to "MINAHASA",
            "7103" to "KEPULAUAN SANGIHE", "7104" to "KEPULAUAN TALAUD", "7105" to "MINAHASA SELATAN", "7106" to "MINAHASA UTARA",
            "7107" to "MINAHASA TENGGARA", "7108" to "BOLAANG MONGONDOW UTARA", "7109" to "KEP. SIAU TAGULANDANG BIARO", "7110" to "BOLAANG MONGONDOW TIMUR",
            "7111" to "BOLAANG MONGONDOW SELATAN", "7171" to "KOTA MANADO", "7172" to "KOTA BITUNG", "7173" to "KOTA TOMOHON",
            "7174" to "KOTA KOTAMOBAGU", "7201" to "BANGGAI", "7202" to "POSO", "7203" to "DONGGALA",
            "7204" to "TOLI-TOLI", "7205" to "BUOL", "7206" to "MOROWALI", "7207" to "BANGGAI KEPULAUAN",
            "7208" to "PARIGI MOUTONG", "7209" to "TOJO UNA UNA", "7210" to "SIGI", "7211" to "BANGGAI LAUT",
            "7212" to "MOROWALI UTARA", "7271" to "KOTA PALU", "7301" to "KEPULAUAN SELAYAR", "7302" to "BULUKUMBA",
            "7303" to "BANTAENG", "7304" to "JENEPONTO", "7305" to "TAKALAR", "7306" to "GOWA",
            "7307" to "SINJAI", "7308" to "BONE", "7309" to "MAROS", "7310" to "PANGKAJENE DAN KEPULAUAN",
            "7311" to "BARRU", "7312" to "SOPPENG", "7313" to "WAJO", "7314" to "SIDENRENG RAPPANG",
            "7315" to "PINRANG", "7316" to "ENREKANG", "7317" to "LUWU", "7318" to "TANA TORAJA",
            "7322" to "LUWU UTARA", "7324" to "LUWU TIMUR", "7326" to "TORAJA UTARA", "7371" to "KOTA MAKASSAR",
            "7372" to "KOTA PAREPARE", "7373" to "KOTA PALOPO", "7401" to "KOLAKA", "7402" to "KONAWE",
            "7403" to "MUNA", "7404" to "BUTON", "7405" to "KONAWE SELATAN", "7406" to "BOMBANA",
            "7407" to "WAKATOBI", "7408" to "KOLAKA UTARA", "7409" to "KONAWE UTARA", "7410" to "BUTON UTARA",
            "7411" to "KOLAKA TIMUR", "7412" to "KONAWE KEPULAUAN", "7413" to "MUNA BARAT", "7414" to "BUTON TENGAH",
            "7415" to "BUTON SELATAN", "7471" to "KOTA KENDARI", "7472" to "KOTA BAU BAU", "7501" to "GORONTALO",
            "7502" to "BOALEMO", "7503" to "BONE BOLANGO", "7504" to "POHUWATO", "7505" to "GORONTALO UTARA",
            "7571" to "KOTA GORONTALO", "7601" to "PASANGKAYU", "7602" to "MAMUJU", "7603" to "MAMASA",
            "7604" to "POLEWALI MANDAR", "7605" to "MAJENE", "7606" to "MAMUJU TENGAH", "8101" to "MALUKU TENGAH",
            "8102" to "MALUKU TENGGARA", "8103" to "KEPULAUAN TANIMBAR", "8104" to "BURU", "8105" to "SERAM BAGIAN TIMUR",
            "8106" to "SERAM BAGIAN BARAT", "8107" to "KEPULAUAN ARU", "8108" to "MALUKU BARAT DAYA", "8109" to "BURU SELATAN",
            "8171" to "KOTA AMBON", "8172" to "KOTA TUAL", "8201" to "HALMAHERA BARAT", "8202" to "HALMAHERA TENGAH",
            "8203" to "HALMAHERA UTARA", "8204" to "HALMAHERA SELATAN", "8205" to "KEPULAUAN SULA", "8206" to "HALMAHERA TIMUR",
            "8207" to "PULAU MOROTAI", "8208" to "PULAU TALIABU", "8271" to "KOTA TERNATE", "8272" to "KOTA TIDORE KEPULAUAN",
            "9103" to "JAYAPURA", "9105" to "KEPULAUAN YAPEN", "9106" to "BIAK NUMFOR", "9110" to "SARMI",
            "9111" to "KEEROM", "9115" to "WAROPEN", "9119" to "SUPIORI", "9120" to "MAMBERAMO RAYA",
            "9171" to "KOTA JAYAPURA", "9202" to "MANOKWARI", "9203" to "FAK FAK", "9206" to "TELUK BINTUNI",
            "9207" to "TELUK WONDAMA", "9208" to "KAIMANA", "9211" to "MANOKWARI SELATAN", "9212" to "PEGUNUNGAN ARFAK",
            "9301" to "MERAUKE", "9302" to "BOVEN DIGOEL", "9303" to "MAPPI", "9304" to "ASMAT",
            "9401" to "NABIRE", "9402" to "PUNCAK JAYA", "9403" to "PANIAI", "9404" to "MIMIKA",
            "9405" to "PUNCAK", "9406" to "DOGIYAI", "9407" to "INTAN JAYA", "9408" to "DEIYAI",
            "9501" to "JAYAWIJAYA", "9502" to "PEGUNUNGAN BINTANG", "9503" to "YAHUKIMO", "9504" to "TOLIKARA",
            "9505" to "MAMBERAMO TENGAH", "9506" to "YALIMO", "9507" to "LANNY JAYA", "9508" to "NDUGA",
            "9601" to "SORONG", "9602" to "SORONG SELATAN", "9603" to "RAJA AMPAT", "9604" to "TAMBRAUW",
            "9605" to "MAYBRAT", "9671" to "KOTA SORONG",
        )
        return mapping[kode4] ?: "INDONESIA"
    }
}
