package com.carga_gestor.wms_mobile.ui.screens.login

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.carga_gestor.wms_mobile.R
import com.carga_gestor.wms_mobile.ui.navigation.ScreenRoutes
import com.carga_gestor.wms_mobile.ui.theme.ThemeManager
import com.carga_gestor.wms_mobile.ui.theme.WmsmobileTheme
import com.carga_gestor.wms_mobile.ui.theme.extraColors
import com.carga_gestor.wms_mobile.util.Resource
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private const val APP_VERSION = "v1.0.0"

@Composable
fun LoginScreen(
    navController: NavController,
    viewModel: LoginViewModel
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    fun goToMain() {
        navController.navigate(ScreenRoutes.MAIN) {
            popUpTo(ScreenRoutes.LOGIN) { inclusive = true }
        }
    }

    // Auto-login: token salvo válido -> tela principal
    LaunchedEffect(Unit) {
        if (viewModel.checkSavedToken()) goToMain()
    }

    // Login manual bem-sucedido -> tela principal
    LaunchedEffect(uiState.isLoggedIn) {
        if (uiState.isLoggedIn) goToMain()
    }

    // Erro -> Snackbar
    LaunchedEffect(uiState.status) {
        val status = uiState.status
        if (status is Resource.Error) {
            snackbarHostState.showSnackbar(message = status.message)
            viewModel.clearError()
        }
    }

    LoginContent(
        isLoading = uiState.isLoading,
        snackbarHostState = snackbarHostState,
        onLogin = { username, password -> viewModel.login(username, password) }
    )
}

@Composable
private fun LoginContent(
    isLoading: Boolean,
    snackbarHostState: SnackbarHostState,
    onLogin: (String, String) -> Unit
) {
    var username by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var usernameTouched by remember { mutableStateOf(false) }
    var passwordTouched by remember { mutableStateOf(false) }

    val focusManager = LocalFocusManager.current
    val inputShape = RoundedCornerShape(8.dp)
    val isDark = ThemeManager.isDark()

    val usernameInvalid = usernameTouched && username.isBlank()
    val passwordInvalid = passwordTouched && password.isBlank()

    fun submit() {
        usernameTouched = true
        passwordTouched = true
        if (username.isBlank() || password.isBlank()) return
        focusManager.clearFocus()
        onLogin(username, password)
    }

    val gradientFrom = MaterialTheme.colorScheme.surfaceContainer
    val gradientTo = MaterialTheme.colorScheme.background

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(gradientTo)
            .drawBehind {
                drawRect(
                    brush = Brush.radialGradient(
                        colors = listOf(gradientFrom, gradientTo),
                        center = Offset(size.width * 0.6f, size.height * 0.4f),
                        radius = maxOf(size.width, size.height)
                    )
                )
            }
    ) {
        Scaffold(
            containerColor = Color.Transparent,
            snackbarHost = { SnackbarHost(snackbarHostState, modifier = Modifier.imePadding()) }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .imePadding(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .widthIn(max = 420.dp),
                        shape = MaterialTheme.shapes.large,
                        color = MaterialTheme.extraColors.bgCard.copy(alpha = 0.7f),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                    ) {
                        Column(modifier = Modifier.padding(24.dp)) {
                            // Header
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Image(
                                    painter = painterResource(R.drawable.ic_carga_gestor),
                                    contentDescription = null,
                                    contentScale = ContentScale.Fit,
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(RoundedCornerShape(6.dp))
                                )
                                Spacer(Modifier.size(12.dp))
                                Column {
                                    Text(
                                        text = "Bem-vindo de volta",
                                        fontSize = 22.sp,
                                        lineHeight = 26.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = "Acesse sua estação de trabalho",
                                        fontSize = 14.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            Spacer(Modifier.height(28.dp))

                            LoginField(
                                label = "Usuário",
                                value = username,
                                onValueChange = { username = it },
                                placeholder = "admin",
                                leadingIcon = Icons.Filled.Email,
                                isError = usernameInvalid,
                                errorText = "Usuário inválido",
                                shape = inputShape,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Text,
                                    imeAction = ImeAction.Next
                                ),
                                keyboardActions = KeyboardActions.Default,
                                onTouched = { usernameTouched = true }
                            )

                            Spacer(Modifier.height(20.dp))

                            LoginField(
                                label = "Senha",
                                value = password,
                                onValueChange = { password = it },
                                placeholder = "••••••••",
                                leadingIcon = Icons.Filled.Lock,
                                isError = passwordInvalid,
                                errorText = "Senha inválida",
                                shape = inputShape,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Password,
                                    imeAction = ImeAction.Done
                                ),
                                keyboardActions = KeyboardActions(onDone = { submit() }),
                                onTouched = { passwordTouched = true },
                                visualTransformation = if (passwordVisible) {
                                    VisualTransformation.None
                                } else {
                                    PasswordVisualTransformation()
                                },
                                trailing = {
                                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                        Icon(
                                            imageVector = if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                                            contentDescription = if (passwordVisible) "Ocultar senha" else "Mostrar senha",
                                            tint = MaterialTheme.extraColors.textMuted,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                            )

                            Spacer(Modifier.height(24.dp))

                            Button(
                                onClick = { submit() },
                                enabled = !isLoading,
                                shape = inputShape,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(44.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    contentColor = MaterialTheme.colorScheme.onPrimary,
                                    disabledContainerColor = MaterialTheme.colorScheme.primary,
                                    disabledContentColor = MaterialTheme.colorScheme.onPrimary
                                )
                            ) {
                                if (isLoading) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(20.dp),
                                        color = MaterialTheme.colorScheme.onPrimary,
                                        strokeWidth = 3.dp
                                    )
                                } else {
                                    Text(
                                        text = "Entrar no Sistema",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Spacer(Modifier.size(8.dp))
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                    }

                    Spacer(Modifier.height(24.dp))

                    Text(
                        text = "© 2026 Gestor de Carga. Versão: $APP_VERSION",
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.extraColors.textDisabled
                    )
                }
            }
        }

        // Toggle de tema: filho direto do Box raiz
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .statusBarsPadding()
                .padding(16.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(MaterialTheme.extraColors.bgCard)
                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(6.dp))
                .clickable { ThemeManager.set(!isDark) }
                .padding(horizontal = 12.dp, vertical = 6.dp)
        ) {
            Text(
                text = if (isDark) "☀️ Claro" else "🌙 Escuro",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun LoginField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    leadingIcon: ImageVector,
    isError: Boolean,
    errorText: String,
    shape: RoundedCornerShape,
    keyboardOptions: KeyboardOptions,
    keyboardActions: KeyboardActions,
    onTouched: () -> Unit,
    modifier: Modifier = Modifier,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    trailing: (@Composable () -> Unit)? = null
) {
    val colors = MaterialTheme.colorScheme
    val extra = MaterialTheme.extraColors
    var focused by remember { mutableStateOf(false) }
    val requester = remember { BringIntoViewRequester() }
    val scope = rememberCoroutineScope()

    val borderColor = when {
        isError -> colors.error
        focused -> colors.primary
        else -> colors.outlineVariant
    }

    Column(modifier = modifier.bringIntoViewRequester(requester)) {
        Text(
            text = label.uppercase(),
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 1.2.sp,
            color = colors.onSurfaceVariant
        )
        Spacer(Modifier.height(8.dp))

        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            textStyle = TextStyle(color = colors.onSurface, fontSize = 14.sp),
            cursorBrush = SolidColor(colors.primary),
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            visualTransformation = visualTransformation,
            modifier = Modifier
                .fillMaxWidth()
                .height(44.dp)
                .onFocusChanged { state ->
                    if (focused && !state.isFocused) onTouched()
                    focused = state.isFocused
                    if (state.isFocused) {
                        // aguarda a animação do teclado antes de rolar
                        scope.launch {
                            delay(250)
                            requester.bringIntoView()
                        }
                    }
                },
            decorationBox = { innerTextField ->
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(extra.inputBg, shape)
                        .border(1.dp, borderColor, shape)
                        .padding(start = 12.dp, end = if (trailing != null) 4.dp else 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = leadingIcon,
                        contentDescription = null,
                        tint = extra.textMuted,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(Modifier.size(10.dp))
                    Box(modifier = Modifier.weight(1f)) {
                        if (value.isEmpty()) {
                            Text(
                                text = placeholder,
                                fontSize = 14.sp,
                                color = extra.textMuted
                            )
                        }
                        innerTextField()
                    }
                    trailing?.invoke()
                }
            }
        )

        if (isError) {
            Text(
                text = errorText,
                fontSize = 12.sp,
                color = colors.error,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun LoginScreenPreview() {
    WmsmobileTheme {
        LoginContent(
            isLoading = false,
            snackbarHostState = remember { SnackbarHostState() },
            onLogin = { _, _ -> }
        )
    }
}