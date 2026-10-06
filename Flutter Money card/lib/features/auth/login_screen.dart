import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/common/app_button.dart';

enum LoginRoleMode {
  selectRole,
  manager,
  kitchen,
}

class LoginScreen extends ConsumerStatefulWidget {
  final LoginRoleMode? initialRole;

  const LoginScreen({
    super.key,
    this.initialRole,
  });

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  late LoginRoleMode _roleMode;

  static final RegExp _emailRegExp = RegExp(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
  );
  static final RegExp _phoneRegExp = RegExp(r'^\d{10}$');

  @override
  void initState() {
    super.initState();
    _roleMode = widget.initialRole ?? LoginRoleMode.selectRole;
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _switchRole(LoginRoleMode mode) {
    _phoneController.clear();
    _passwordController.clear();
    _formKey.currentState?.reset();
    ref.read(authNotifierProvider.notifier).clearError();
    setState(() {
      _roleMode = mode;
    });
  }

  Future<void> _handleLogin() async {
    FocusScope.of(context).unfocus();
    if (!_formKey.currentState!.validate()) return;

    final input = _phoneController.text.trim();
    final password = _passwordController.text;

    final isEmail = input.contains('@');
    final expectedRole = _roleMode == LoginRoleMode.kitchen ? 'KITCHEN' : 'MANAGER';

    await ref.read(authNotifierProvider.notifier).login(
          email: isEmail ? input : null,
          phone: isEmail ? null : input,
          password: password,
          expectedRole: expectedRole,
        );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: AppSpacing.paddingLg,
            child: Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: AppSpacing.roundedLg,
              ),
              color: AppColors.surfaceLight,
              child: Padding(
                padding: AppSpacing.paddingXl,
                child: _roleMode == LoginRoleMode.selectRole
                    ? _buildRoleSelectionView(authState)
                    : _buildRoleLoginForm(authState),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRoleSelectionView(AuthState authState) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Brand Icon
        Center(
          child: Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: const BoxDecoration(
              color: AppColors.primaryLight,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.credit_card,
              size: 44,
              color: AppColors.primaryDark,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),

        // Title
        const Text(
          'MONEY CARD',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
            color: AppColors.textPrimaryLight,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: AppSpacing.lg),

        // Session Expired Banner if applicable
        if (authState.isSessionExpired) ...[
          _buildSessionExpiredBanner(authState),
          const SizedBox(height: AppSpacing.md),
        ],

        // Error Banner if applicable
        if (authState.status == AuthStatus.error && authState.errorMessage != null) ...[
          _buildErrorBanner(authState.errorMessage!),
          const SizedBox(height: AppSpacing.md),
        ],

        // 1. Counter Manager Card Button
        _buildRoleSelectionCard(
          title: 'Counter Manager',
          icon: Icons.point_of_sale_outlined,
          accentColor: AppColors.primary,
          badgeBg: AppColors.primaryLight,
          onTap: () => _switchRole(LoginRoleMode.manager),
        ),
        const SizedBox(height: AppSpacing.md),

        // 2. Kitchen Staff Card Button
        _buildRoleSelectionCard(
          title: 'Kitchen Staff',
          icon: Icons.soup_kitchen_outlined,
          accentColor: const Color(0xFF2563EB),
          badgeBg: const Color(0xFFDBEAFE),
          onTap: () => _switchRole(LoginRoleMode.kitchen),
        ),
      ],
    );
  }

  Widget _buildRoleSelectionCard({
    required String title,
    required IconData icon,
    required Color accentColor,
    required Color badgeBg,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppSpacing.roundedMd,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: AppSpacing.roundedMd,
            border: Border.all(color: accentColor.withValues(alpha: 0.3), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: accentColor.withValues(alpha: 0.06),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  icon,
                  size: 26,
                  color: accentColor,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimaryLight,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.arrow_forward_ios,
                size: 14,
                color: accentColor.withValues(alpha: 0.7),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRoleLoginForm(AuthState authState) {
    final isKitchen = _roleMode == LoginRoleMode.kitchen;
    final accentColor = isKitchen ? const Color(0xFF2563EB) : AppColors.primary;
    final badgeBg = isKitchen ? const Color(0xFFDBEAFE) : AppColors.primaryLight;

    return Form(
      key: _formKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Top Navigation Row
          Row(
            children: [
              IconButton(
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: const Icon(Icons.arrow_back, size: 20),
                onPressed: () => _switchRole(LoginRoleMode.selectRole),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),

          // Brand Icon
          Center(
            child: Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: badgeBg,
                shape: BoxShape.circle,
              ),
              child: Icon(
                isKitchen ? Icons.soup_kitchen_outlined : Icons.credit_card,
                size: 40,
                color: accentColor,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // Title
          const Text(
            'MONEY CARD',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
              color: AppColors.textPrimaryLight,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xxs),
          Text(
            isKitchen ? 'Kitchen Staff' : 'Counter Manager',
            style: const TextStyle(
              fontSize: 15,
              color: AppColors.textSecondaryLight,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.lg),

          // Session Expired Banner
          if (authState.isSessionExpired) ...[
            _buildSessionExpiredBanner(authState),
            const SizedBox(height: AppSpacing.md),
          ],

          // General / Invalid Credentials Error Banner
          if (authState.status == AuthStatus.error && authState.errorMessage != null) ...[
            _buildErrorBanner(authState.errorMessage!),
            const SizedBox(height: AppSpacing.md),
          ],

          // Phone Number Field
          const Text(
            'Phone Number',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimaryLight,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            textInputAction: TextInputAction.next,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(10),
            ],
            decoration: const InputDecoration(
              hintText: '10-digit mobile number',
              prefixIcon: Icon(Icons.phone_android_outlined, size: 20),
            ),
            validator: (val) {
              if (val == null || val.trim().isEmpty) {
                return 'Phone number is required';
              }
              final trimmed = val.trim();
              if (trimmed.contains('@')) {
                if (!_emailRegExp.hasMatch(trimmed)) {
                  return 'Enter a valid email address';
                }
                return null;
              }
              if (!_phoneRegExp.hasMatch(trimmed)) {
                return 'Enter a valid 10-digit mobile number';
              }
              return null;
            },
          ),
          const SizedBox(height: AppSpacing.md),

          // Password Field
          const Text(
            'Password',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimaryLight,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _handleLogin(),
            decoration: InputDecoration(
              hintText: '••••••••',
              prefixIcon: const Icon(Icons.lock_outline, size: 20),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscurePassword
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  size: 20,
                ),
                onPressed: () {
                  setState(() => _obscurePassword = !_obscurePassword);
                },
              ),
            ),
            validator: (val) {
              if (val == null || val.isEmpty) {
                return 'Password is required';
              }
              return null;
            },
          ),
          const SizedBox(height: AppSpacing.lg),

          // Login Button
          AppButton(
            label: 'Login',
            backgroundColor: accentColor,
            isLoading: authState.isAuthenticating,
            onPressed: authState.isAuthenticating ? null : _handleLogin,
          ),
        ],
      ),
    );
  }

  Widget _buildSessionExpiredBanner(AuthState authState) {
    return Container(
      padding: AppSpacing.paddingMd,
      decoration: BoxDecoration(
        color: AppColors.warningLight,
        borderRadius: AppSpacing.roundedMd,
        border: Border.all(color: AppColors.warning, width: 1.2),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock_clock_outlined, color: AppColors.warning),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              authState.errorMessage ?? 'Your session has expired. Please log in again.',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimaryLight,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorBanner(String message) {
    return Container(
      padding: AppSpacing.paddingMd,
      decoration: BoxDecoration(
        color: AppColors.errorLight,
        borderRadius: AppSpacing.roundedMd,
        border: Border.all(color: AppColors.error, width: 1.2),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.error),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.error,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
