import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, ScrollView, Platform } from 'react-native';
import { db } from '../../../firebase';
import { collection, query, orderBy, where, getDocs, doc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';

interface Report {
    id: string;
    postDetails?: {
        createdAt?: Timestamp;
        location?: string;
        userName?: string;
        postId?: string;
        postTitle?: string;
        reportReason?: string;
        reportedAt?: Timestamp;
        reportedBy?: string;
        status?: 'pending' | 'resolved' | 'rejected';
        description?: string;
    };
    reportData?: string;
}

type FilterType = 'all' | 'pending' | 'resolved' | 'rejected';

const ManageReports: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [modalVisible, setModalVisible] = useState<boolean>(false);

    const fetchReports = async () => {
        setLoading(true);
        try {
            let q;
            const reportsCollection = collection(db, 'reports');
            
            if (filter === 'all') {
                q = query(reportsCollection, orderBy('postDetails.createdAt', 'desc'));
            } else {
                q = query(
                    reportsCollection,
                    where('postDetails.status', '==', filter),
                    orderBy('postDetails.createdAt', 'desc')
                );
            }

            const querySnapshot = await getDocs(q);

            const reportsData = querySnapshot.docs.map(document => {
                return {
                    ...(document.data() as Report),
                    id: document.id,
                    reportData: (document.data() as Report).postDetails
                } as Report;
            });

            setReports(reportsData);
        } catch (error) {
            console.error("Error fetching reports:", error);
            Alert.alert("Error", "Failed to load reports");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [filter]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchReports();
    };

    const handleUpdateStatus = async (reportId: string, newStatus: 'pending' | 'resolved' | 'rejected') => {
        try {
            const reportRef = doc(db, 'reports', reportId);
            
            await updateDoc(reportRef, {
                'postDetails.status': newStatus,
                'postDetails.resolvedAt': serverTimestamp(),
            });

            // Update local state
            const updatedReports = reports.map((report) => {
                if (report.id === reportId) {
                    // Create a copy of the report and update the status within postDetails
                    const updatedReport = {
                        ...report,
                        postDetails: {
                            ...report.postDetails,
                            status: newStatus,
                        },
                    };
                    
                    // If we're viewing the report details, update the selected report too
                    if (selectedReport && selectedReport.id === reportId) {
                        setSelectedReport(updatedReport);
                    }
                    
                    return updatedReport;
                }
                return report;
            });
            
            setReports(updatedReports);

            // Close modal if the current filter doesn't match the new status
            // (if we're in the pending tab and mark something as resolved, close the modal)
            if (filter !== 'all' && filter !== newStatus) {
                setModalVisible(false);
            }

            Alert.alert("Success", `Report marked as ${newStatus}`);
        } catch (error) {
            console.error("Error updating report status:", error);
            Alert.alert("Error", "Failed to update report status");
        }
    };

    const handleViewDetails = (report: Report) => {
        setSelectedReport(report);
        setModalVisible(true);
    };

    const renderReportItem = ({ item }: { item: Report }) => (
        <TouchableOpacity
            style={styles.reportItem}
            onPress={() => handleViewDetails(item)}
        >
            <View style={styles.reportHeader}>
                <Text style={styles.reportType}>{item.postDetails?.reportReason || 'Report'}</Text>
                <View
                    style={[
                        styles.statusBadge,
                        {
                            backgroundColor:
                                item.postDetails?.status === 'pending'
                                    ? '#FFC107'
                                    : item.postDetails?.status === 'resolved'
                                        ? '#4CAF50'
                                        : '#F44336',
                        },
                    ]}
                >
                    <Text style={styles.statusText}>{item.postDetails?.status}</Text>
                </View>
            </View>

            <Text style={styles.reportDescription} numberOfLines={2}>
                {item.postDetails?.description || 'No description provided'}
            </Text>

            <View style={styles.reportDetails}>
                <Text style={styles.reportedInfo}>
                    Reporter: {item.postDetails?.userName || 'Unknown'}
                </Text>
                <Text style={styles.reportedInfo}>
                    Reported: {item.postDetails?.postId || 'Unknown'}
                </Text>
                <Text style={styles.reportDate}>
                    {item.postDetails?.createdAt 
                        ? new Date(item.postDetails.createdAt.toDate()).toLocaleDateString() 
                        : 'Unknown date'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'pending' && styles.activeFilter]}
                    onPress={() => setFilter('pending')}
                >
                    <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'resolved' && styles.activeFilter]}
                    onPress={() => setFilter('resolved')}
                >
                    <Text style={[styles.filterText, filter === 'resolved' && styles.activeFilterText]}>Resolved</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'rejected' && styles.activeFilter]}
                    onPress={() => setFilter('rejected')}
                >
                    <Text style={[styles.filterText, filter === 'rejected' && styles.activeFilterText]}>Rejected</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={reports}
                renderItem={renderReportItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.reportsList}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No reports found</Text>
                    </View>
                }
            />

            {/* Report Detail Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(false);
                }}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        {selectedReport && (
                            <ScrollView style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{selectedReport.postDetails?.reportReason || 'Report Details'}</Text>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            {
                                                backgroundColor:
                                                    selectedReport.postDetails?.status === 'pending'
                                                        ? '#FFC107'
                                                        : selectedReport.postDetails?.status === 'resolved'
                                                            ? '#4CAF50'
                                                            : '#F44336',
                                            },
                                        ]}
                                    >
                                        <Text style={styles.statusText}>{selectedReport.postDetails?.status}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailSection}>
                                    <Text style={styles.sectionTitle}>Report Information</Text>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Reported By:</Text>
                                        <Text style={styles.detailValue}>{selectedReport.postDetails?.userName || 'Unknown'}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Post ID:</Text>
                                        <Text style={styles.detailValue}>{selectedReport.postDetails?.postId || 'Unknown'}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Post Title:</Text>
                                        <Text style={styles.detailValue}>{selectedReport.postDetails?.postTitle || 'Unknown'}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Location:</Text>
                                        <Text style={styles.detailValue}>{selectedReport.postDetails?.location || 'Unknown'}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Reported At:</Text>
                                        <Text style={styles.detailValue}>
                                            {selectedReport.postDetails?.reportedAt 
                                                ? new Date(selectedReport.postDetails.reportedAt.toDate()).toLocaleString() 
                                                : 'Unknown'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.detailSection}>
                                    <Text style={styles.sectionTitle}>Description</Text>
                                    <Text style={styles.descriptionText}>
                                        {selectedReport.postDetails?.description || 'No description provided'}
                                    </Text>
                                </View>

                                {/* Actions for Pending Reports */}
                                {selectedReport.postDetails?.status === 'pending' && (
                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, { backgroundColor: '#4CAF50', flex: 1 }]}
                                            onPress={() => handleUpdateStatus(selectedReport.id, 'resolved')}
                                        >
                                            <Text style={styles.actionButtonText}>Mark as Resolved</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionButton, { backgroundColor: '#F44336', flex: 1, marginLeft: 10 }]}
                                            onPress={() => handleUpdateStatus(selectedReport.id, 'rejected')}
                                        >
                                            <Text style={styles.actionButtonText}>Reject Report</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Actions for Resolved/Rejected Reports */}
                                {selectedReport.postDetails?.status !== 'pending' && (
                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, { backgroundColor: '#FFC107', flex: 1 }]}
                                            onPress={() => handleUpdateStatus(selectedReport.id, 'pending')}
                                        >
                                            <Text style={styles.actionButtonText}>Move to Pending</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: '#757575', marginTop: 10 }]}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.actionButtonText}>Close</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f4f4f4',
        paddingTop: Platform.OS === 'ios' ? 45 : 25,
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
        backgroundColor: '#ddd',
    },
    activeFilter: {
        backgroundColor: '#4B0082',
    },
    filterText: {
        fontSize: 16,
        color: '#555',
    },
    activeFilterText: {
        color: '#fff',
    },
    reportsList: {
        paddingBottom: 20,
    },
    reportItem: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
        elevation: 3,
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    reportType: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    statusBadge: {
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    reportDescription: {
        fontSize: 14,
        color: '#555',
        marginBottom: 10,
    },
    reportDetails: {
        marginBottom: 10,
    },
    reportedInfo: {
        fontSize: 14,
        color: '#777',
    },
    reportDate: {
        fontSize: 12,
        color: '#888',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    actionButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#777',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 0,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        overflow: 'hidden',
    },
    modalContent: {
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        paddingBottom: 15,
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    detailSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
        width: 100,
        fontWeight: '600',
    },
    detailValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    descriptionText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    modalActions: {
        flexDirection: 'row',
        marginTop: 20,
    },
});

export default ManageReports;