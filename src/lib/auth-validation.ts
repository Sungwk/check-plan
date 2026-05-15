/** 회원가입·비밀번호 재설정: 영문·숫자·특수문자 각 1자 이상, 6자 이상 */
export const AUTH_PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

export const DISPLAY_NAME_MAX_LEN = 8;

export const PASSWORD_POLICY_MESSAGE =
  '비밀번호는 영문, 숫자, 특수문자를 각각 1자 이상 포함해 6자 이상 입력해 주세요.';

export function isValidAuthPassword(password: string): boolean {
  return AUTH_PASSWORD_PATTERN.test(password);
}

export function validateDisplayName(name: string): string | undefined {
  const t = name.trim();
  if (!t) return '이름을 입력해 주세요.';
  if (t.length > DISPLAY_NAME_MAX_LEN) {
    return `이름은 ${DISPLAY_NAME_MAX_LEN}자 이하여야 합니다.`;
  }
  return undefined;
}

export function displayNameForStorage(name: string): string {
  return name.trim().slice(0, DISPLAY_NAME_MAX_LEN);
}
