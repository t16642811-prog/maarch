#!/bin/bash
TAG_BASE="2301"
EXIST=0
for row in $(curl --header "PRIVATE-TOKEN: $TOKEN_GITLAB" "https://labs.maarch.org/api/v4/projects/$CI_PROJECT_ID/repository/branches?search=2301_releases" | jq -r '.[] | @base64'); do
  _jq() {
    echo "${row}" | base64 --decode | jq -r "${1}"
  }
  EXIST=$((EXIST + 1))
done

if [ $EXIST == 1 ]
then
  echo "2301_releases already exist, skipping ..."
else
  echo "Fetch all tags..."

  FIRST_TAG=0

  for row in $(curl --header "PRIVATE-TOKEN: $TOKEN_GITLAB" "https://labs.maarch.org/api/v4/projects/$CI_PROJECT_ID/repository/tags?search=^$TAG_BASE" | jq -r '.[] | @base64'); do
      _jq() {
          echo "${row}" | base64 --decode | jq -r "${1}"
      }

      NAME=$(_jq '.name')

      IS_TMA=$(echo "$NAME" | grep -o '[.]*_TMA[.]*')

      if [[ -n $IS_TMA ]]; then
          echo "TMA tag branch : $NAME ! Skipping..."
      else
          TAGS+=("$NAME")
      fi
  done
  if [ ${#TAGS[@]} -eq 0 ]; then
    FIRST_TAG=1
    LATEST_TAG="$TAG_BASE.0.0"
    BRANCH_TAG_VERSION=$TAG_BASE
    MAJOR_TAG_VERSION='0'
    MINOR_TAG_VERSION='0'
    NEXT_TAG="$TAG_BASE.0.0"
    NEXT_NEXT_TAG="$TAG_BASE.0.1"
  else
      SORTED_TAGS=($(echo "${TAGS[*]}" | tr " " "\n" | sort -Vr))
      LATEST_TAG=$(echo "${SORTED_TAGS[0]}")

      structures=$(echo "$LATEST_TAG" | tr "." "\n")

      IT=1
      for item in $structures; do
          if [ $IT = 1 ]; then
              BRANCH_TAG_VERSION=$item
          fi

          if [ $IT = 2 ]; then
              MAJOR_TAG_VERSION="$item"
          fi

          if [ $IT = 3 ]; then
              MINOR_TAG_VERSION=$item
          fi

          IT=$((IT + 1))
      done
  fi
  if [ $FIRST_TAG == 0 ]; then
      VERSION=$((MINOR_TAG_VERSION + 1))
      VERSION_NEXT=$((MINOR_TAG_VERSION + 2))
      NEXT_TAG="$BRANCH_TAG_VERSION.$MAJOR_TAG_VERSION.$VERSION"
      NEXT_NEXT_TAG="$BRANCH_TAG_VERSION.$MAJOR_TAG_VERSION.$VERSION"
  fi

  echo "2301_releases branch does not exist, creating ..."

  # Create 2301_releases branche
  BRANCH_CREATION_URL="https://labs.maarch.org/api/v4/projects/$CI_PROJECT_ID/repository/branches?branch=2301_releases&ref=main"
  echo "$BRANCH_CREATION_URL"

  curl --request POST --header "PRIVATE-TOKEN: $TOKEN_GITLAB" "$BRANCH_CREATION_URL"

  # Create 2301_releases mr
  MR_CREATION_URL="https://labs.maarch.org/api/v4/projects/$CI_PROJECT_ID/merge_requests"
  BODY="{\"id\":\"$CI_PROJECT_ID\",\"source_branch\":\"2301_releases\",\"target_branch\":\"main\",\"title\":\"Next tag release\",\"description\":\"\",\"remove_source_branch\":\"true\",\"squash\":\"false\"}"

  curl -v -H "PRIVATE-TOKEN: $TOKEN_GITLAB" -H "Content-Type: application/json" -X POST -d "$BODY" "$MR_CREATION_URL"

  # Update files version
  git config --global user.email "$GITLAB_USER_EMAIL" && git config --global user.name "$GITLAB_USER_NAME" && git config core.fileMode false
  git remote set-url origin "https://gitlab-ci-token:${TOKEN_GITLAB}@${GITLAB_URL}/${CI_PROJECT_PATH}.git"
  git fetch
  git branch -D $TAG_BASE"_releases"
  git pull origin $TAG_BASE"_releases"
  git checkout $TAG_BASE"_releases"

  # Update app version
  cp package.json tmp_package.json
  cp package-lock.json tmp_package-lock.json

  jq ".version = \"$NEXT_NEXT_TAG\"" tmp_package.json > package.json
  jq ".version = \"$NEXT_NEXT_TAG\"" tmp_package-lock.json > package-lock.json

  rm tmp_package.json tmp_package-lock.json

  git add -f package.json package-lock.json
  git commit -m "Update next tag version files : $NEXT_NEXT_TAG"
  git push
fi

