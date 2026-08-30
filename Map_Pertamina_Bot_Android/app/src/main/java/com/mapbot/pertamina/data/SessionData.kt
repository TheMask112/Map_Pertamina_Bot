package com.mapbot.pertamina.data

import com.mapbot.pertamina.security.PangkalanProfile

data class QueuePangkalanItem(
    val profile: PangkalanProfile,
    var nikList: List<NikData> = emptyList(),
    var fileName: String = ""
)

object SessionData {
    var loadedNikList: List<NikData> = emptyList()
    var selectedFileName: String = ""
    var phone: String = ""
    var pass: String = ""

    // Auto-Batch Queue Multi-Pangkalan (Enterprise 5000)
    var batchQueue: List<QueuePangkalanItem> = emptyList()
    var currentQueueIndex: Int = 0
    var isBatchQueueActive: Boolean = false
}
