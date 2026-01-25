import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';

const LEGAL_TEXT = `
# Spotch 利用規約・プライバシーポリシー・ガイドライン（統合版）

本書は、Spotch（以下「当サービス」）の利用に関するすべての条件、ならびにプライバシー、ポイント、広告演出、安全、コミュニティルールを統合的に定めるものです。

---

## 第1章 サービスの概要

Spotchは、位置情報を利用したソーシャルゲームです。
実世界の場所（以下「スポット」）を体験・共有することで、遊びや交流を楽しむことを目的としています。

当サービスへの参加は完全に任意であり、雇用、業務委託、アルバイト、労務提供には該当しません。

ユーザーは、特定の場所に行く義務や、一定時間滞在する義務を負いません。

---

## 第2章 アカウントおよび利用条件

* ユーザーは正確な情報を登録してください。
* 不正目的での複数アカウント利用は禁止します。
* 当サービスは予告なく仕様変更を行う場合があります。

---

## 第3章 スポットと参加について

スポットは、当サービス上の体験地点です。

* 訪問や滞在は自由です
* 参加・離脱はいつでも可能です
* 参加しても報酬やポイント取得は保証されません

---

## 第4章 ポイントについて

Spotchポイントは、仮想的なゲーム内要素です。

* 賃金、給与、報酬ではありません
* 労務の対価ではありません
* 現金価値や換金性はありません
* 取得は保証されません

ポイントは以下を総合的に考慮して付与される場合があります。

* スポット全体の活動状況
* 参加の多様性やタイミング
* 全体のシステムバランス

以下を基準として付与されることはありません。

* 滞在時間
* 作業量やタスク達成
* 広告の視聴や操作

---

## 第5章 課金および仮想アイテム

ユーザーはポイント等の仮想アイテムを購入することができます。

* 購入はアプリ内体験向上を目的とします
* 投資行為ではありません
* 利益や収益は保証されません
* 第三者への譲渡・転売は禁止します

返金は、各プラットフォーム（App Store / Google Play）の規定に従います。

---

## 第6章 スポンサー・演出スポット

一部のスポットには、演出強化やスポンサー要素が含まれる場合があります。

* 広告の閲覧や操作を求めるものではありません
* 広告視聴を条件としたポイント付与は行われません
* 演出はゲーム体験の一部です

---

## 第7章 位置情報とプライバシー

当サービスは以下の情報を取得する場合があります。

* アカウント情報（ニックネーム、アバター、メール等）
* 位置情報（アプリ使用中のみ）
* 利用履歴、端末情報

バックグラウンドでの常時位置追跡は行いません。

取得した情報は以下の目的で利用されます。

* サービス提供および運営
* ゲーム体験の提供
* 不正防止および安全確保
* 通知配信

個人情報を販売することはありません。

---

## 第8章 安全および現実世界での注意

ユーザーは現地の法律・規則・マナーを遵守してください。

* 私有地や立入禁止区域に入らない
* 危険行為を行わない
* 運転中の利用は禁止します

不安や危険を感じた場合は、直ちに当サービスの利用を中断してください。

---

## 第9章 コミュニティルール

以下の行為を禁止します。

* 嫌がらせ、脅迫、ストーキング行為
* 他ユーザーへの迷惑行為
* GPS偽装、不正行為、システム悪用

違反が確認された場合、警告、利用制限、アカウント停止を行う場合があります。

---

## 第10章 免責および責任範囲

当サービスは、以下を保証しません。

* ポイント取得
* 収益や成果
* 特定の結果

ユーザーは自己責任で当サービスを利用するものとします。

---

## 第11章 規約の変更

本規約は予告なく変更される場合があります。
継続利用をもって同意とみなされます。

---

## 第12章 準拠法

本規約は日本法に準拠します。

---

## お問い合わせ

support@spotch.app
`;

export default function LegalScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <View className="flex-row items-center justify-between px-4 py-2 border-b-2 border-black bg-white">
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <Ionicons name="close" size={28} color="black" />
                </TouchableOpacity>
                <Text className="text-lg font-black text-black">LEGAL</Text>
                <View className="w-10" />
            </View>
            <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 50 }}>
                <Markdown
                    style={{
                        body: { color: '#333', fontSize: 14, lineHeight: 24 },
                        heading1: { fontSize: 24, fontWeight: '900', marginBottom: 20, color: '#000' },
                        heading2: { fontSize: 18, fontWeight: 'bold', marginTop: 24, marginBottom: 12, color: '#000', borderBottomWidth: 2, borderBottomColor: '#eee', paddingBottom: 4 },
                        hr: { backgroundColor: 'transparent', height: 0 },
                    }}
                >
                    {LEGAL_TEXT}
                </Markdown>
            </ScrollView>
        </SafeAreaView>
    );
}
