"use client";
import React, { useState } from "react";
import { formatEther } from "viem";
import { useFamily } from "@/context/FamilyContext";
import { useVaultStates } from "@/hooks/useVaultStates";
import { useAuth } from "@/hooks/useAuth";
import { VaultExperience } from "@/components/vaults/VaultExperience";
import { Money, SourceBadge } from "@/components/vaults/ExperiencePrimitives";
function ContractRosca() {
  const family = useFamily();
  const auth = useAuth();
  const { states, errors, refresh } = useVaultStates();
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const vaults = family.dynamicVaults.filter((v) => v.ruleTemplate === "ROSCA");
  const vault = vaults.find((v) => v.id === selected) || vaults[0];
  const data = vault && states[vault.id];
  const act = async (action: () => Promise<boolean>) => {
    if (busy) return;
    setBusy(true);
    try {
      setMessage(
        (await action())
          ? "Giao dịch đã gửi. Theo dõi trạng thái xác nhận và đồng bộ."
          : "Chưa hoàn tất. Kiểm tra thông báo Core.",
      );
      await refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!vaults.length)
    return (
      <div className="vx-empty">
        <h2>Chưa có quỹ smart contract</h2>
        <p>Quỹ được triển khai và cấp quyền sẽ xuất hiện tại đây.</p>
      </div>
    );
  return (
    <div className="vx-content">
      <label>
        Chọn quỹ
        <select value={vault?.id} onChange={(e) => setSelected(e.target.value)}>
          {vaults.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      {message && (
        <p role="status" className="vx-notice">
          {message}
        </p>
      )}
      {errors[vault.id] && (
        <p role="alert" className="vx-alert">
          {errors[vault.id]}
        </p>
      )}
      {data?.rosca ? (
        <>
          <div className="vx-overview">
            <section className="vx-hero">
              <SourceBadge contract />
              <h2>{vault.name}</h2>
              <p>
                {data.rosca.ended
                  ? "Chu kỳ đã hoàn tất"
                  : `Kỳ ${Number(data.state.roscaCurrentRound) + 1} / ${data.state.beneficiaries.length}`}
              </p>
              <Money
                wei={String(data.state.totalBalance)}
                className="vx-hero-money"
              />
              <p>Số dư quỹ trên smart contract</p>
            </section>
            <aside className="vx-card">
              <h2>Khoản góp cố định</h2>
              <Money
                wei={String(data.state.roscaRoundContribution)}
                className="vx-large-money"
              />
              <p>
                Sớm nhất giải ngân{" "}
                {new Date(
                  Number(data.rosca.nextPayoutAt) * 1000,
                ).toLocaleString("vi-VN")}
              </p>
              <button
                className="vx-button"
                disabled={
                  busy ||
                  data.rosca.ended ||
                  !data.capabilities.contributeRoscaRound.allowed ||
                  data.rosca.contributions.some(
                    (p: any) =>
                      p.contributed &&
                      p.address.toLowerCase() ===
                        auth.linkedWallet?.address?.toLowerCase(),
                  )
                }
                onClick={() =>
                  void act(
                    async () =>
                      (
                        await family.depositToVault(
                          vault.onchainVaultId,
                          formatEther(
                            BigInt(data.state.roscaRoundContribution),
                          ),
                        )
                      ).success,
                  )
                }
              >
                Góp đúng khoản kỳ này
              </button>
              <button
                className="vx-button-secondary"
                disabled={
                  busy ||
                  data.rosca.ended ||
                  !data.capabilities.payoutRoscaRound.allowed ||
                  data.rosca.contributions.some((p: any) => !p.contributed) ||
                  Date.now() < Number(data.rosca.nextPayoutAt) * 1000
                }
                onClick={() =>
                  void act(() =>
                    family.payoutRoscaRound(vault.onchainVaultId, vault.id),
                  )
                }
              >
                Giải ngân kỳ này
              </button>
              <p className="vx-muted">
                Điều kiện được kiểm tra lại trên contract trước khi chi.
              </p>
            </aside>
          </div>
          <section className="vx-card">
            <h2>Thành viên và trạng thái đóng góp</h2>
            <div className="vx-roster">
              {data.rosca.contributions.map((person: any, index: number) => (
                <div key={person.address}>
                  <span className="vx-avatar">{index + 1}</span>
                  <span className="vx-address">
                    {family.members.find(
                      (p) =>
                        p.walletAddress?.toLowerCase() ===
                        person.address.toLowerCase(),
                    )?.name ||
                      `${person.address.slice(0, 6)}…${person.address.slice(-4)}`}
                  </span>
                  <span>{person.contributed ? "Đã góp" : "Chưa góp"}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        !errors[vault.id] && <p role="status">Đang đối soát quỹ với mạng…</p>
      )}
    </div>
  );
}
export function RoscaView(_props: { currentMember?: unknown }) {
  return <VaultExperience kind="ROSCA" legacy={<ContractRosca />} />;
}
export default RoscaView;
