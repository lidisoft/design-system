#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
	echo "usage: $0 <tag-or-ref>" >&2
	exit 1
fi

target="$1"

if ! git rev-parse --verify "$target^{commit}" >/dev/null 2>&1; then
	echo "unknown revision: $target" >&2
	exit 1
fi

repo_url() {
	if [[ -n "${GITHUB_SERVER_URL:-}" && -n "${GITHUB_REPOSITORY:-}" ]]; then
		printf '%s/%s\n' "$GITHUB_SERVER_URL" "$GITHUB_REPOSITORY"
		return
	fi

	local remote
	remote="$(git config --get remote.origin.url 2>/dev/null || true)"

	case "$remote" in
		git@github.com:*)
			remote="${remote#git@github.com:}"
			remote="${remote%.git}"
			printf 'https://github.com/%s\n' "$remote"
			;;
		ssh://git@github.com/*)
			remote="${remote#ssh://git@github.com/}"
			remote="${remote%.git}"
			printf 'https://github.com/%s\n' "$remote"
			;;
		https://github.com/*)
			remote="${remote%.git}"
			printf '%s\n' "$remote"
			;;
		http://github.com/*)
			remote="${remote%.git}"
			printf '%s\n' "$remote"
			;;
		*)
			printf '\n'
			;;
	esac
}

repo="$(repo_url)"
previous_tag="$(git describe --tags --abbrev=0 "$target^" 2>/dev/null || true)"

if [[ -n "$previous_tag" ]]; then
	range="$previous_tag..$target"
else
	range="$target"
fi

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

breaking_file="$workdir/breaking.md"
features_file="$workdir/features.md"
fixes_file="$workdir/fixes.md"
other_file="$workdir/other.md"

append_entry() {
	local file="$1"
	local scope="$2"
	local text="$3"
	local sha="$4"
	local entry="$text"

	if [[ -n "$scope" ]]; then
		entry="**$scope**: $entry"
	fi
	if [[ -n "$repo" ]]; then
		entry="$entry ([$sha]($repo/commit/$sha))"
	else
		entry="$entry ($sha)"
	fi

	printf -- '- %s\n' "$entry" >> "$file"
}

re_scoped='^([[:alpha:]][[:alnum:]-]*)\(([^)]*)\)(!)?:[[:space:]]*(.*)$'
re_unscoped='^([[:alpha:]][[:alnum:]-]*)(!)?:[[:space:]]*(.*)$'

while IFS=$'\x1f' read -r -d $'\x1e' sha subject body; do
	[[ -n "$sha" && -n "$subject" ]] || continue

	scope=""
	text="$subject"
	out="$other_file"

	if [[ "$subject" =~ $re_scoped ]]; then
		type="${BASH_REMATCH[1]}"
		scope="${BASH_REMATCH[2]}"
		bang="${BASH_REMATCH[3]}"
		text="${BASH_REMATCH[4]}"
		if [[ -n "$bang" || "$body" == *"BREAKING CHANGE:"* ]]; then
			out="$breaking_file"
		elif [[ "$type" == "feat" ]]; then
			out="$features_file"
		elif [[ "$type" == "fix" ]]; then
			out="$fixes_file"
		fi
	elif [[ "$subject" =~ $re_unscoped ]]; then
		type="${BASH_REMATCH[1]}"
		bang="${BASH_REMATCH[2]}"
		text="${BASH_REMATCH[3]}"
		if [[ -n "$bang" || "$body" == *"BREAKING CHANGE:"* ]]; then
			out="$breaking_file"
		elif [[ "$type" == "feat" ]]; then
			out="$features_file"
		elif [[ "$type" == "fix" ]]; then
			out="$fixes_file"
		fi
	elif [[ "$body" == *"BREAKING CHANGE:"* ]]; then
		out="$breaking_file"
	fi

	append_entry "$out" "$scope" "$text" "$sha"
done < <(git log --no-merges --pretty=format:'%h%x1f%s%x1f%b%x1e' "$range")

target_name="$target"
if git rev-parse --verify "refs/tags/$target" >/dev/null 2>&1; then
	target_name="$(git tag --points-at "$target" | sed -n '1p')"
fi

printf '# %s\n\n' "$target_name"

printed_section=0
for section in \
	"Breaking changes:$breaking_file" \
	"Features:$features_file" \
	"Fixes:$fixes_file" \
	"Other:$other_file"
do
	title="${section%%:*}"
	file="${section#*:}"
	if [[ -s "$file" ]]; then
		if [[ $printed_section -eq 1 ]]; then
			printf '\n'
		fi
		printf '## %s\n\n' "$title"
		cat "$file"
		printf '\n'
		printed_section=1
	fi
done

if [[ $printed_section -eq 0 ]]; then
	printf 'No commits found in this release range.\n'
fi

if [[ -n "$previous_tag" && -n "$repo" ]]; then
	printf '\n**Full changelog**: [%s...%s](%s/compare/%s...%s)\n' \
		"$previous_tag" "$target_name" "$repo" "$previous_tag" "$target_name"
fi
