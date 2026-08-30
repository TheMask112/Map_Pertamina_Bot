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
                        var phoneInput = document.querySelector("input[placeholder*='Nomor Ponsel']");
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
                            
                            btn.click();
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
        wvManager.executeJs("""
            (function() {
                var els = document.querySelectorAll('button, [role="button"], a, div, span');
                var targetText = '$buttonText'.toLowerCase();
                var bestMatch = null;
                var minLength = 999999;
                for (var i = 0; i < els.length; i++) {
                    var txt = els[i].innerText;
                    if (txt && txt.trim().toLowerCase().includes(targetText)) {
                        var rect = els[i].getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            if (txt.length < minLength) {
                                minLength = txt.length;
                                bestMatch = els[i];
                            }
                            if (els[i].tagName.toLowerCase() === 'button' && txt.trim().toLowerCase() === targetText) {
                                bestMatch = els[i];
                                break;
                            }
                        }
                    }
                }
                if (bestMatch) {
                    bestMatch.click();
                    return 'true';
                }
                return 'false';
            })()
        """) { result ->
            cont.resume(result.replace("\"", "") == "true")
        }
    }

    suspend fun fillNik(nik: String) {
        wvManager.executeJs("""
            (function() {
                var input = document.querySelector("${Constants.INPUT_NIK}");
                if (input) {
                    var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    nativeInputValueSetter.call(input, '');
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.focus();
                }
            })()
        """)
        delay(300)

        for (char in nik) {
            wvManager.executeJs("""
                (function() {
                    var input = document.querySelector("${Constants.INPUT_NIK}");
                    if (input) {
                        var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                        nativeInputValueSetter.call(input, input.value + '$char');
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                })()
            """)
            delay(Random.nextLong(50, 120))
        }
    }

    suspend fun getBodyText(): String = suspendCoroutine { cont ->
        wvManager.executeJs("document.body.innerText") { result ->
            cont.resume(result.replace("\"", ""))
        }
    }

    suspend fun isElementVisible(selector: String): Boolean = suspendCoroutine { cont ->
        wvManager.executeJs("""
            (function() {
                try {
                    var el = document.querySelector('$selector');
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
        wvManager.executeJs("""
            (function() {
                var els = document.querySelectorAll('button, [role="button"], a, span, div');
                var targetText = '$text'.toLowerCase();
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
                            var btn = document.querySelector("$sel");
                            if (btn) { btn.click(); return 'true'; }
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
        wvManager.executeJs("""
            (function() {
                var el = document.querySelector('$selector');
                if (el) { el.click(); return 'true'; }
                return 'false';
            })()
        """) { result ->
            cont.resume(result.replace("\"", "") == "true")
        }
    }

    suspend fun getInputValue(selector: String): String = suspendCoroutine { cont ->
        wvManager.executeJs("""
            (function() {
                var el = document.querySelector('$selector');
                return el ? el.value : '';
            })()
        """) { result ->
            cont.resume(result.replace("\"", ""))
        }
    }

    suspend fun scrollToElement(selector: String) {
        wvManager.executeJs("""
            (function() {
                var el = document.querySelector('$selector');
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

    suspend fun handleBirthDetails(nik: String, tempatLahirCustom: String = ""): Boolean = suspendCoroutine { cont ->
        val cleanNik = nik.filter { it.isDigit() }
        if (cleanNik.length != 16) {
            cont.resume(false)
            return@suspendCoroutine
        }

        val rawDay = cleanNik.substring(6, 8).toIntOrNull() ?: 1
        val day = if (rawDay > 40) rawDay - 40 else rawDay
        val month = (cleanNik.substring(8, 10).toIntOrNull() ?: 1).coerceIn(1, 12)
        val rawYear = cleanNik.substring(10, 12).toIntOrNull() ?: 90
        val currentYear2d = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR) % 100
        val year = if (rawYear > currentYear2d) 1900 + rawYear else 2000 + rawYear

        val dmy = String.format(java.util.Locale.US, "%02d/%02d/%04d", day, month, year)
        val ymd = String.format(java.util.Locale.US, "%04d-%02d-%02d", year, month, day)

        val tempatLahir = if (tempatLahirCustom.isNotEmpty()) {
            tempatLahirCustom.uppercase()
        } else {
            val kode4 = cleanNik.substring(0, 4)
            getCityNameFromKode(kode4)
        }

        wvManager.executeJs("""
            (function() {
                var filledAny = false;
                
                // 1. Tempat Lahir
                var tempatSelectors = [
                    "input[placeholder*='Tempat Lahir' i]",
                    "input[placeholder*='Tempat' i]",
                    "input[name*='tempatLahir' i]",
                    "input[name*='birthPlace' i]",
                    "input[id*='tempatLahir' i]",
                    "input[id*='birth_place' i]",
                    "input[aria-label*='Tempat Lahir' i]",
                    "input[placeholder*='Kota Lahir' i]"
                ];
                for (var i = 0; i < tempatSelectors.length; i++) {
                    var el = document.querySelector(tempatSelectors[i]);
                    if (el) {
                        var rect = el.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0 && !el.value) {
                            var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                            nativeSetter.call(el, '$tempatLahir');
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                            filledAny = true;
                            break;
                        }
                    }
                }

                // 2. Tanggal Lahir
                var tglSelectors = [
                    "input[placeholder*='Tanggal Lahir' i]",
                    "input[placeholder*='Tgl Lahir' i]",
                    "input[placeholder*='DD/MM/YYYY' i]",
                    "input[placeholder*='DD-MM-YYYY' i]",
                    "input[placeholder*='YYYY-MM-DD' i]",
                    "input[type='date']",
                    "input[name*='tanggalLahir' i]",
                    "input[name*='birthDate' i]",
                    "input[id*='tanggalLahir' i]",
                    "input[id*='birth_date' i]",
                    "input[aria-label*='Tanggal Lahir' i]"
                ];
                for (var j = 0; j < tglSelectors.length; j++) {
                    var elTgl = document.querySelector(tglSelectors[j]);
                    if (elTgl) {
                        var rectTgl = elTgl.getBoundingClientRect();
                        if (rectTgl.width > 0 && rectTgl.height > 0 && !elTgl.value) {
                            var dateVal = elTgl.type === 'date' ? '$ymd' : '$dmy';
                            var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                            nativeSetter.call(elTgl, dateVal);
                            elTgl.dispatchEvent(new Event('input', { bubbles: true }));
                            elTgl.dispatchEvent(new Event('change', { bubbles: true }));
                            filledAny = true;
                            break;
                        }
                    }
                }

                // 3. Dropdowns terpisah jika ada
                var elDay = document.querySelector("select[name*='day' i], select[name*='hari' i], select[id*='day' i]");
                if (elDay && elDay.offsetParent !== null) { elDay.value = '$day'; elDay.dispatchEvent(new Event('change', { bubbles: true })); filledAny = true; }

                var elMonth = document.querySelector("select[name*='month' i], select[name*='bulan' i], select[id*='month' i]");
                if (elMonth && elMonth.offsetParent !== null) { elMonth.value = '$month'; elMonth.dispatchEvent(new Event('change', { bubbles: true })); filledAny = true; }

                var elYear = document.querySelector("select[name*='year' i], select[name*='tahun' i], select[id*='year' i]");
                if (elYear && elYear.offsetParent !== null) { elYear.value = '$year'; elYear.dispatchEvent(new Event('change', { bubbles: true })); filledAny = true; }

                return filledAny ? 'true' : 'false';
            })()
        """) { result ->
            cont.resume(result.replace("\"", "") == "true")
        }
    }

    private fun getCityNameFromKode(kode4: String): String {
        val mapping = mapOf(
            "3101" to "KEPULAUAN SERIBU", "3171" to "JAKARTA SELATAN", "3172" to "JAKARTA TIMUR",
            "3173" to "JAKARTA PUSAT", "3174" to "JAKARTA BARAT", "3175" to "JAKARTA UTARA",
            "3201" to "BOGOR", "3202" to "SUKABUMI", "3203" to "CIANJUR", "3204" to "BANDUNG",
            "3205" to "GARUT", "3206" to "TASIKMALAYA", "3207" to "CIAMIS", "3208" to "KUNINGAN",
            "3209" to "CIREBON", "3210" to "MAJALENGKA", "3211" to "SUMEDANG", "3212" to "INDRAMAYU",
            "3213" to "SUBANG", "3214" to "PURWAKARTA", "3215" to "KARAWANG", "3216" to "BEKASI",
            "3217" to "BANDUNG BARAT", "3218" to "PANGANDARAN", "3271" to "KOTA BOGOR",
            "3272" to "KOTA SUKABUMI", "3273" to "KOTA BANDUNG", "3274" to "KOTA CIREBON",
            "3275" to "KOTA BEKASI", "3276" to "KOTA DEPOK", "3277" to "KOTA CIMAHI",
            "3278" to "KOTA TASIKMALAYA", "3279" to "KOTA BANJAR",
            "3601" to "PANDEGLANG", "3602" to "LEBAK", "3603" to "TANGERANG", "3604" to "SERANG",
            "3671" to "KOTA TANGERANG", "3672" to "KOTA CILEGON", "3673" to "KOTA SERANG",
            "3674" to "KOTA TANGERANG SELATAN",
            "3301" to "CILACAP", "3302" to "BANYUMAS", "3303" to "PURBALINGGA", "3304" to "BANJARNEGARA",
            "3305" to "KEBUMEN", "3306" to "PURWOREJO", "3307" to "WONOSOBO", "3308" to "MAGELANG",
            "3309" to "BOYOLALI", "3310" to "KLATEN", "3311" to "SUKOHARJO", "3312" to "WONOGIRI",
            "3313" to "KARANGANYAR", "3314" to "SRAGEN", "3315" to "GROBOGAN", "3316" to "BLORA",
            "3317" to "REMBANG", "3318" to "PATI", "3319" to "KUDUS", "3320" to "JEPARA",
            "3321" to "DEMAK", "3322" to "SEMARANG", "3323" to "TEMANGGUNG", "3324" to "KENDAL",
            "3325" to "BATANG", "3326" to "PEKALONGAN", "3327" to "PEMALANG", "3328" to "TEGAL",
            "3329" to "BREBES", "3371" to "KOTA MAGELANG", "3372" to "KOTA SURAKARTA",
            "3373" to "KOTA SALATIGA", "3374" to "KOTA SEMARANG", "3375" to "KOTA PEKALONGAN",
            "3376" to "KOTA TEGAL",
            "3401" to "KULON PROGO", "3402" to "BANTUL", "3403" to "GUNUNGKIDUL", "3404" to "SLEMAN", "3471" to "KOTA YOGYAKARTA",
            "3501" to "PACITAN", "3502" to "PONOROGO", "3503" to "TRENGGALEK", "3504" to "TULUNGAGUNG",
            "3505" to "BLITAR", "3506" to "KEDIRI", "3507" to "MALANG", "3508" to "LUMAJANG",
            "3509" to "JEMBER", "3510" to "BANYUWANGI", "3511" to "BONDOWOSO", "3512" to "SITUBONDO",
            "3513" to "PROBOLINGGO", "3514" to "PASURUAN", "3515" to "SIDOARJO", "3516" to "MOJOKERTO",
            "3517" to "JOMBANG", "3518" to "NGANJUK", "3519" to "MADIUN", "3520" to "MAGETAN",
            "3521" to "NGAWI", "3522" to "BOJONEGORO", "3523" to "TUBAN", "3524" to "LAMONGAN",
            "3525" to "GRESIK", "3526" to "BANGKALAN", "3527" to "SAMPANG", "3528" to "PAMEKASAN",
            "3529" to "SUMENEP", "3571" to "KOTA KEDIRI", "3572" to "KOTA BLITAR", "3573" to "KOTA MALANG",
            "3574" to "KOTA PROBOLINGGO", "3575" to "KOTA PASURUAN", "3576" to "KOTA MOJOKERTO",
            "3577" to "KOTA MADIUN", "3578" to "KOTA SURABAYA", "3579" to "KOTA BATU"
        )
        return mapping[kode4] ?: "INDONESIA"
    }

    suspend fun getNamaPangkalan(): String = suspendCoroutine { cont ->
        wvManager.executeJs("""
            (function() {
                try {
                    var el = document.querySelector('.merchant-name');
                    if (el && el.innerText) return el.innerText;
                    var el2 = document.querySelector('h1.text-lg, h2.text-lg, .text-lg.font-bold');
                    if (el2 && el2.innerText) return el2.innerText;
                    return '';
                } catch (e) {
                    return '';
                }
            })()
        """) { result ->
            val cleanResult = result.replace("\"", "").trim()
            if (cleanResult == "null") cont.resume("")
            else cont.resume(cleanResult)
        }
    }
}
