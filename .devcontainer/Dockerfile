# ==============================================================================
# Dev Container for sajangbook
# Node 20 LTS + opencode + Git
# ==============================================================================

FROM node:20-bookworm

# 메타데이터
LABEL maintainer="sajangbook"
LABEL description="Dev Container for 매입/판매/원가 관리 SaaS"

# 필수 패키지만 설치 (최소화)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    locales \
    && rm -rf /var/lib/apt/lists/*

# 한국어 로케일 설정
RUN sed -i '/ko_KR.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
ENV LANG=ko_KR.UTF-8
ENV LC_ALL=ko_KR.UTF-8

# opencode 전역 설치
RUN npm install -g @anthropics/claude-code

# node 유저로 전환 (보안)
USER node

# 작업 디렉토리
WORKDIR /workspaces/sajangbook

# 기본 쉘
SHELL ["/bin/bash", "-c"]

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node --version && npm --version || exit 1
