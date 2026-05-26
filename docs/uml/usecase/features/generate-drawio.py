#!/usr/bin/env python3
"""Generate draw.io use case diagrams — bám mẫu Quản lý lịch chiếu (mũi tên thẳng)."""

from __future__ import annotations

import html
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

OUT = Path(__file__).parent

# Tọa độ cố định — giống mẫu luận văn
ACTOR_X, ACTOR_Y = 30, 175
MAIN_X = 140
UC_X = 360
LOGIN_X = 620
CENTER_Y = 200
UC_GAP = 110

ACTOR_STYLE = (
    "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;"
    "html=1;outlineConnect=0;fontStyle=0;fontSize=13;"
)
UC_STYLE = "ellipse;whiteSpace=wrap;html=1;aspect=fixed;fontStyle=0;fontSize=13;"
EDGE_SOLID = (
    "endArrow=block;endFill=1;html=1;rounded=0;strokeWidth=1;edgeStyle=none;"
)
EDGE_DASHED = (
    "endArrow=open;endFill=0;dashed=1;html=1;rounded=0;strokeWidth=1;edgeStyle=none;"
    "verticalAlign=bottom;labelBackgroundColor=none;fontSize=11;"
)


def esc(text: str) -> str:
    return html.escape(text, quote=True)


@dataclass
class Node:
    id: int
    x: int
    y: int
    w: int
    h: int

    @property
    def cx(self) -> int:
        return self.x + self.w // 2

    @property
    def cy(self) -> int:
        return self.y + self.h // 2

    @property
    def left(self) -> int:
        return self.x

    @property
    def right(self) -> int:
        return self.x + self.w


def uc_size(text: str) -> tuple[int, int]:
    w = max(130, min(210, len(text) * 7 + 36))
    h = 55 if len(text) <= 26 else 65
    return w, h


def uc_ys(n: int) -> list[int]:
    if n == 1:
        return [CENTER_Y]
    if n == 2:
        return [CENTER_Y - UC_GAP // 2, CENTER_Y + UC_GAP // 2]
    mid = CENTER_Y
    return [mid - UC_GAP, mid, mid + UC_GAP]


def build_drawio(cells: list[str]) -> str:
    body = "\n        ".join(cells)
    return f"""<mxfile host="app.diagrams.net" modified="2026-05-25T00:00:00.000Z" agent="generate-drawio.py" version="22.1.0">
  <diagram name="Page-1" id="page-1">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="520" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        {body}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
"""


def vertex(nid: int, label: str, style: str, node: Node) -> str:
    return (
        f'<mxCell id="{nid}" value="{esc(label)}" style="{style}" vertex="1" parent="1">'
        f'<mxGeometry x="{node.x}" y="{node.y}" width="{node.w}" height="{node.h}" as="geometry"/></mxCell>'
    )


def straight(eid: int, style: str, x1: int, y1: int, x2: int, y2: int, label: str = "") -> str:
    """Mũi tên thẳng (ngang hoặc chéo) — giống mẫu luận văn."""
    lbl = f' value="{esc(label)}"' if label else ""
    return (
        f'<mxCell id="{eid}"{lbl} style="{style}" edge="1" parent="1">'
        f'<mxGeometry relative="1" as="geometry">'
        f'<mxPoint x="{x1}" y="{y1}" as="sourcePoint"/>'
        f'<mxPoint x="{x2}" y="{y2}" as="targetPoint"/>'
        f"</mxGeometry></mxCell>"
    )


def diagram(actor_label: str, main: str, subs: Optional[List[str]] = None, login: bool = False) -> str:
    subs = subs or []
    cells: list[str] = []
    cid = 2

    actor_node = Node(cid, ACTOR_X, ACTOR_Y, 30, 60)
    cells.append(vertex(cid, actor_label, ACTOR_STYLE, actor_node))
    cid += 1

    mw, mh = uc_size(main)
    main_y = CENTER_Y - mh // 2
    main_node = Node(cid, MAIN_X, main_y, mw, mh)
    cells.append(vertex(cid, main, UC_STYLE, main_node))
    cid += 1

    cells.append(
        straight(cid, EDGE_SOLID, actor_node.right, actor_node.cy, main_node.left, main_node.cy)
    )
    cid += 1

    uc_nodes: list[Node] = []
    for label in subs:
        uw, uh = uc_size(label)
        y = uc_ys(len(subs))[len(uc_nodes)] - uh // 2
        node = Node(cid, UC_X, y, uw, uh)
        cells.append(vertex(cid, label, UC_STYLE, node))
        uc_nodes.append(node)
        cid += 1

    login_node = None
    if login:
        lw, lh = 110, 55
        login_node = Node(cid, LOGIN_X, CENTER_Y - lh // 2, lw, lh)
        cells.append(vertex(cid, "Đăng nhập", UC_STYLE, login_node))
        cid += 1

    for node in uc_nodes:
        # <<extend>> : chức năng con → use case chính (mũi tên thẳng)
        cells.append(
            straight(
                cid, EDGE_DASHED,
                node.left, node.cy,
                main_node.right, main_node.cy,
                "<<extend>>",
            )
        )
        cid += 1

    if login and login_node:
        if uc_nodes:
            for node in uc_nodes:
                # <<include>> : chức năng con → đăng nhập (mũi tên thẳng)
                cells.append(
                    straight(
                        cid, EDGE_DASHED,
                        node.right, node.cy,
                        login_node.left, login_node.cy,
                        "<<include>>",
                    )
                )
                cid += 1
        else:
            cells.append(
                straight(
                    cid, EDGE_DASHED,
                    main_node.right, main_node.cy,
                    login_node.left, login_node.cy,
                    "<<include>>",
                )
            )
            cid += 1

    return build_drawio(cells)


SPECS = [
    ("admin/ad-01-dang-nhap.drawio", "Quản trị viên", "Đăng nhập", None, False),
    ("admin/ad-02-dang-xuat.drawio", "Quản trị viên", "Đăng xuất", None, False),
    ("admin/ad-03-quan-ly-chu-de.drawio", "Quản trị viên", "Quản lý chủ đề",
     ["Xem danh sách chủ đề", "Thêm mới chủ đề", "Cập nhật chủ đề"], True),
    ("admin/ad-04-quan-ly-chuong-trinh.drawio", "Quản trị viên", "Quản lý chương trình",
     ["Xem danh sách chương trình", "Thêm mới chương trình", "Cập nhật chương trình"], True),
    ("admin/ad-05-thong-ke.drawio", "Quản trị viên", "Thống kê",
     ["Xem thống kê học viên", "Xem tiến độ học viên", "Xem báo cáo học tập"], True),
    ("admin/ad-06-quan-ly-user.drawio", "Quản trị viên", "Quản lý user",
     ["Xem danh sách người dùng", "Xem chi tiết người dùng", "Cập nhật người dùng"], True),
    ("admin/ad-07-thong-bao.drawio", "Quản trị viên", "Thông báo",
     ["Gửi thông báo toàn hệ thống", "Gửi thông báo theo user", "Phản hồi feedback người dùng"], True),
    ("hoc-vien/hv-01-dang-nhap.drawio", "Học viên", "Đăng nhập", None, False),
    ("hoc-vien/hv-02-dang-xuat.drawio", "Học viên", "Đăng xuất", None, False),
    ("hoc-vien/hv-03-chu-de.drawio", "Học viên", "Chủ đề",
     ["Xem danh sách bài học", "Xem chi tiết bài học", "Cập nhật tiến độ"], True),
    ("hoc-vien/hv-04-chi-tiet-chu-de.drawio", "Học viên", "Chi tiết chủ đề",
     ["Xem topic bài học", "Xem quiz câu hỏi", "Làm bài tập"], True),
    ("hoc-vien/hv-05-hoc-bai.drawio", "Học viên", "Học bài",
     ["Xem nội dung bài", "Cập nhật tiến độ học", "Đánh dấu hoàn thành"], True),
    ("hoc-vien/hv-06-lam-quiz.drawio", "Học viên", "Làm quiz",
     ["Xem câu hỏi quiz", "Trả lời quiz", "Cập nhật điểm"], True),
    ("hoc-vien/hv-07-thao-luan.drawio", "Học viên", "Thảo luận",
     ["Xem bình luận", "Gửi bình luận", "Chat realtime"], True),
    ("hoc-vien/hv-08-thong-tin-ca-nhan.drawio", "Học viên", "Thông tin cá nhân", None, True),
    ("hoc-vien/hv-09-bao-cao-cau-hoi.drawio", "Học viên", "Báo cáo câu hỏi",
     ["Gửi câu hỏi Q&A", "Gửi feedback bài học", "Gửi feedback hệ thống"], True),
    ("hoc-vien/hv-10-hien-thi-ket-qua.drawio", "Học viên", "Hiển thị kết quả",
     ["Xem điểm bài học", "Xem điểm theo ngày", "Xem kết quả quiz"], True),
    ("hoc-vien/hv-11-thong-ke.drawio", "Học viên", "Thống kê",
     ["Xem tiến độ học tập", "Xem điểm tích lũy", "Xem lịch sử học"], True),
    ("hoc-vien/hv-12-xep-hang.drawio", "Học viên", "Xếp hạng",
     ["Xem bảng xếp hạng", "Xem hạng cá nhân", "Xem top bài học"], True),
]

if __name__ == "__main__":
    for path, actor, main, subs, login in SPECS:
        out = OUT / path
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(diagram(actor, main, subs, login), encoding="utf-8")
        print("wrote", path)
