package expo.modules.smsreader

import android.database.Cursor
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SmsReaderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoSmsReader")

    AsyncFunction("readInbox") { maxCount: Int?, sinceTimestamp: Double? ->
      val context = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any>>()
      val smsList = mutableListOf<Map<String, Any>>()
      val uri: Uri = Uri.parse("content://sms/inbox")

      val limit = maxCount ?: 100
      val since = sinceTimestamp?.toLong() ?: 0L

      val projection = arrayOf("_id", "address", "body", "date")
      val selection = if (since > 0L) "date >= ?" else null
      val selectionArgs = if (since > 0L) arrayOf(since.toString()) else null
      val sortOrder = "date DESC LIMIT $limit"

      try {
        val cursor: Cursor? = context.contentResolver.query(
          uri,
          projection,
          selection,
          selectionArgs,
          sortOrder
        )

        cursor?.use {
          val indexId = it.getColumnIndex("_id")
          val indexAddress = it.getColumnIndex("address")
          val indexBody = it.getColumnIndex("body")
          val indexDate = it.getColumnIndex("date")

          while (it.moveToNext()) {
            val id = if (indexId != -1) it.getString(indexId) ?: "" else ""
            val address = if (indexAddress != -1) it.getString(indexAddress) ?: "" else ""
            val body = if (indexBody != -1) it.getString(indexBody) ?: "" else ""
            val date = if (indexDate != -1) it.getLong(indexDate) else 0L

            smsList.add(
              mapOf(
                "id" to id,
                "sender" to address,
                "body" to body,
                "timestamp" to date.toDouble()
              )
            )
          }
        }
      } catch (e: Exception) {
        android.util.Log.w("ExpoSmsReader", "Error querying SMS content provider", e)
      }

      smsList
    }
  }
}
