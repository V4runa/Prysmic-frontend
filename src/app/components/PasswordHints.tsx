import {
  PASSWORD_REQUIREMENTS,
  PASSWORD_STRENGTH_HINT,
  assessPassword,
  type PasswordRuleState,
} from "../lib/passwordPolicy";

const RULE_CLASS: Record<PasswordRuleState, string> = {
  idle: "text-slate-500",
  met: "text-cyan-200",
  unmet: "text-rose-300",
};

const RULE_SPOKEN: Record<PasswordRuleState, string> = {
  idle: "Requirement. ",
  met: "Met. ",
  unmet: "Not met. ",
};

function Requirement({ state, label }: { state: PasswordRuleState; label: string }) {
  return (
    <li className={RULE_CLASS[state]}>
      <span className="sr-only">{RULE_SPOKEN[state]}</span>
      {label}
    </li>
  );
}

/**
 * Requirements are visible before typing. Length and identity update as the
 * password changes. The strength line is a hint and never a submit gate.
 */
export default function PasswordHints({
  id,
  password,
  email,
  username,
}: {
  id: string;
  password: string;
  email?: string | null;
  username?: string | null;
}) {
  const assessment = assessPassword(password, { email, username });
  const strength = assessment.strength;

  return (
    <div id={id} className="flex flex-col gap-1.5 text-xs leading-relaxed">
      <ul className="flex flex-col gap-0.5" aria-label="Password requirements">
        {PASSWORD_REQUIREMENTS.map((rule) => (
          <Requirement key={rule.id} state={assessment.rules[rule.id]} label={rule.label} />
        ))}
      </ul>
      {strength === "empty" ? null : (
        <p className="text-slate-500">
          <span className="text-slate-400">Strength: {strength}. </span>
          {PASSWORD_STRENGTH_HINT[strength]}
        </p>
      )}
    </div>
  );
}
