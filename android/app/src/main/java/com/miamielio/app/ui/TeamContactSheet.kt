package com.miamielio.app.ui

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.miamielio.app.R
import com.miamielio.app.app.ManagerContact

/**
 * Contact chooser for the live Miami Elio team: WhatsApp Business,
 * official Telegram (@MIAMI_ELIO), and the US business phone line.
 */
@Composable
internal fun TeamContactSheet(
    visible: Boolean,
    onDismiss: () -> Unit,
    onOpen: (String) -> Unit,
    prefill: String? = null,
) {
    if (!visible) return
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        val shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp, bottomStart = 24.dp, bottomEnd = 24.dp)
        Box(
            Modifier
                .fillMaxSize()
                .systemBarsPadding()
                .navigationBarsPadding(),
            contentAlignment = Alignment.BottomCenter,
        ) {
            // Separate dimmed scrim sibling so the panel and buttons stay independent in semantics.
            Box(
                Modifier
                    .fillMaxSize()
                    .clearAndSetSemantics { }
                    .background(Color.Black.copy(alpha = 0.6f))
                    .clickable(interactionSource = null, indication = null, onClick = onDismiss),
            )
            Column(
                Modifier
                    .padding(horizontal = 16.dp, vertical = 16.dp)
                    .widthIn(max = 460.dp)
                    .fillMaxWidth()
                    .clip(shape)
                    .oceanBackground()
                    .border(1.dp, Ocean.glassEdge, shape)
                    .pointerInput(Unit) { detectTapGestures {} }
                    .padding(horizontal = 20.dp, vertical = 20.dp)
                    .testTag("team.sheet"),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            stringResource(R.string.team_title),
                            Modifier.semantics { heading() },
                            color = Ocean.pearl,
                            style = AppFont.cardTitle,
                        )
                        Text(
                            stringResource(R.string.team_subtitle),
                            color = Ocean.pearl.copy(alpha = 0.75f),
                            style = AppFont.detail,
                        )
                    }
                    IconButton(onClick = onDismiss, modifier = Modifier.size(48.dp).testTag("team.close")) {
                        Icon(
                            painter = painterResource(R.drawable.ic_close),
                            contentDescription = stringResource(R.string.action_cancel),
                            tint = Ocean.pearl,
                        )
                    }
                }
                ChannelRow(
                    icon = R.drawable.ic_whatsapp,
                    label = stringResource(R.string.team_whatsapp),
                    accent = true,
                    tag = "team.whatsapp",
                    onClick = {
                        onDismiss()
                        onOpen(ManagerContact.whatsAppUrl(prefill))
                    },
                )
                ChannelRow(
                    icon = R.drawable.ic_telegram,
                    label = stringResource(R.string.team_telegram),
                    accent = false,
                    tag = "team.telegram",
                    onClick = {
                        onDismiss()
                        onOpen(ManagerContact.TELEGRAM_URL)
                    },
                )
                ChannelRow(
                    icon = R.drawable.ic_phone,
                    label = stringResource(R.string.team_phone),
                    accent = false,
                    tag = "team.phone",
                    onClick = {
                        onDismiss()
                        onOpen(ManagerContact.PHONE_URL)
                    },
                )
            }
        }
    }
}

@Composable
private fun ChannelRow(
    @DrawableRes icon: Int,
    label: String,
    accent: Boolean,
    tag: String,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(18.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (accent) SolidColor(Ocean.glassField) else Ocean.glass)
            .border(1.dp, if (accent) Ocean.champagne else Ocean.glassEdge, shape)
            .pressable(role = Role.Button, onClick = onClick)
            .heightIn(min = 56.dp)
            .padding(horizontal = 14.dp, vertical = 10.dp)
            .testTag(tag),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            Modifier
                .size(38.dp)
                .clip(CircleShape)
                .background(if (accent) Ocean.sunset else SolidColor(Ocean.glassDark))
                .then(if (accent) Modifier else Modifier.border(1.dp, Ocean.glassEdge, CircleShape)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(painterResource(icon), null, Modifier.size(19.dp), tint = Color.White)
        }
        Text(label, Modifier.weight(1f), color = Ocean.pearl, style = AppFont.rowTitle)
        Icon(
            painterResource(R.drawable.ic_arrow_forward),
            contentDescription = null,
            modifier = Modifier.size(15.dp).painted(Ocean.champagne),
            tint = Color.White,
        )
    }
}
