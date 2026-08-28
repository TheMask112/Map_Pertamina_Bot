package com.mapbot.pertamina.license

import android.util.Base64
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.X509EncodedKeySpec

object LicenseManager {
    fun verifySignature(data: String, signatureBase64: String, publicKeyString: String): Boolean {
        try {
            val pubKeyClean = publicKeyString
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replace("\n", "")
                .replace("\r", "")
                .trim()
            
            val publicBytes = Base64.decode(pubKeyClean, Base64.DEFAULT)
            val keySpec = X509EncodedKeySpec(publicBytes)
            val keyFactory = KeyFactory.getInstance("RSA")
            val publicKey = keyFactory.generatePublic(keySpec)

            val sig = Signature.getInstance("SHA256withRSA")
            sig.initVerify(publicKey)
            sig.update(data.toByteArray())

            val signatureBytes = Base64.decode(signatureBase64, Base64.DEFAULT)
            return sig.verify(signatureBytes)
        } catch (e: Exception) {
            e.printStackTrace()
            return false
        }
    }
}
