#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Motor de Asignación Automática.
Lee por stdin un JSON con: producto_id, stock_disponible, criterio, pedidos.
Escribe por stdout un JSON con lista de { pedido_id, cantidad_asignada }.
"""

import json
import sys
from datetime import datetime


def parse_fecha(s):
    if s is None:
        return datetime.min
    if hasattr(s, 'isoformat'):
        return s
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00'))
    except Exception:
        return datetime.min


def asignar_prioridad_fifo(pedidos, stock):
    """Asignar por orden de llegada (FIFO)."""
    ordenados = sorted(pedidos, key=lambda x: parse_fecha(x.get('fecha_solicitud')))
    return asignar_secuencial(ordenados, stock)


def asignar_prioridad_mayor(pedidos, stock):
    """Mayor prioridad numérica primero; empate por FIFO."""
    ordenados = sorted(
        pedidos,
        key=lambda x: (-(x.get('prioridad') or 0), parse_fecha(x.get('fecha_solicitud')))
    )
    return asignar_secuencial(ordenados, stock)


def asignar_prioridad_cantidad(pedidos, stock):
    """Atender primero los pedidos de menor cantidad solicitada."""
    ordenados = sorted(pedidos, key=lambda x: (x.get('cantidad_solicitada') or 0))
    return asignar_secuencial(ordenados, stock)


def asignar_prioridad_cliente(pedidos, stock):
    """Por defecto igual que prioridad (mayor valor primero)."""
    return asignar_prioridad_mayor(pedidos, stock)


def asignar_secuencial(pedidos_ordenados, stock_disponible):
    resultado = []
    restante = stock_disponible
    for p in pedidos_ordenados:
        pid = p.get('id')
        ya_asignado = p.get('cantidad_asignada') or 0
        solicitado = p.get('cantidad_solicitada') or 0
        falta = max(0, solicitado - ya_asignado)
        a_asignar = min(falta, restante)
        if a_asignar > 0:
            resultado.append({"pedido_id": pid, "cantidad_asignada": a_asignar})
            restante -= a_asignar
        if restante <= 0:
            break
    return resultado


def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        sys.stderr.write(str(e))
        sys.exit(1)

    stock = int(data.get("stock_disponible") or 0)
    criterio = (data.get("criterio") or "prioridad_fifo").strip()
    pedidos = data.get("pedidos") or []

    if stock <= 0 or not pedidos:
        print(json.dumps([]))
        return

    if criterio == "prioridad_fifo":
        asignaciones = asignar_prioridad_fifo(pedidos, stock)
    elif criterio == "prioridad_mayor":
        asignaciones = asignar_prioridad_mayor(pedidos, stock)
    elif criterio == "prioridad_cantidad":
        asignaciones = asignar_prioridad_cantidad(pedidos, stock)
    elif criterio == "prioridad_cliente":
        asignaciones = asignar_prioridad_cliente(pedidos, stock)
    else:
        asignaciones = asignar_prioridad_fifo(pedidos, stock)

    print(json.dumps(asignaciones))


if __name__ == "__main__":
    main()
