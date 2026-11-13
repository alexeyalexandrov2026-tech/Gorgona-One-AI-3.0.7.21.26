package com.miamielio.app.favorites

import android.content.SharedPreferences
import com.miamielio.app.core.FavoriteRef
import com.miamielio.app.core.bool
import com.miamielio.app.core.lossyArray
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** One private, versioned record so the visible keys and ordered queue are written together. */
internal class FavoritesPreferences(private val preferences: SharedPreferences) : FavoritesPersistence {
    override fun load(): FavoritesSnapshot {
        val value = try {
            preferences.getString(SNAPSHOT, null)
        } catch (_: ClassCastException) {
            null
        } ?: return FavoritesSnapshot()
        val record = try {
            Json.parseToJsonElement(value) as? JsonObject
        } catch (_: SerializationException) {
            null
        } ?: return FavoritesSnapshot()
        val keys = (record["keys"] as? JsonArray).orEmpty()
            .asSequence()
            .mapNotNull { (it as? JsonPrimitive)?.takeIf(JsonPrimitive::isString)?.content }
            .filter(FavoriteRef::isKey)
            .toSet()
        return FavoritesSnapshot(keys, record.lossyArray("pending", ::readChange))
    }

    override fun save(snapshot: FavoritesSnapshot) {
        val record = buildJsonObject {
            put("keys", JsonArray(snapshot.keys.map(::JsonPrimitive)))
            put("pending", JsonArray(snapshot.pending.map { it.favorite.changeJson(it.on) }))
        }
        preferences.edit().putString(SNAPSHOT, record.toString()).apply()
    }

    private fun readChange(change: JsonObject): FavoriteChange? {
        val on = change.bool("on") ?: return null
        val favorite = FavoriteRef.of(
            kind = change.string("kind") ?: return null,
            slug = change.string("slug") ?: return null,
            title = change.string("title") ?: return null,
            subtitle = change.string("subtitle"),
            image = change.string("image"),
        ) ?: return null
        return FavoriteChange(favorite, on)
    }

    private fun JsonObject.string(key: String): String? =
        (this[key] as? JsonPrimitive)?.takeIf(JsonPrimitive::isString)?.content

    private companion object {
        const val SNAPSHOT = "snapshot_v1"
    }
}
